import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyRoomToken } from './replitAuth.js';
import { storage } from './storage.js';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  roomId?: string;
  isAuthenticated?: boolean;
}

interface RoomConnection {
  ws: AuthenticatedWebSocket;
  userId: string;
  joinedAt: Date;
}

export class SecureWebSocketManager {
  private wss: WebSocketServer;
  private rooms = new Map<string, Map<string, RoomConnection>>();
  private connectionHeartbeat = new Map<WebSocket, NodeJS.Timeout>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Periodic cleanup of old room states
    setInterval(() => {
      storage.cleanupOldRoomStates();
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private verifyClient(info: any): boolean {
    // Basic verification - token will be verified on message
    return true;
  }

  private handleConnection(ws: AuthenticatedWebSocket) {
    console.log('New WebSocket connection established');
    
    // Setup heartbeat
    this.setupHeartbeat(ws);
    
    ws.on('message', (message) => {
      this.handleMessage(ws, message);
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });

    // Send connection acknowledgment
    ws.send(JSON.stringify({ 
      type: 'connection-established',
      timestamp: new Date().toISOString()
    }));
  }

  private setupHeartbeat(ws: WebSocket) {
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        this.clearHeartbeat(ws);
      }
    }, 30000); // 30 seconds

    this.connectionHeartbeat.set(ws, heartbeat);

    ws.on('pong', () => {
      // Client is still alive
    });
  }

  private clearHeartbeat(ws: WebSocket) {
    const heartbeat = this.connectionHeartbeat.get(ws);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.connectionHeartbeat.delete(ws);
    }
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: any) {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'authenticate':
          await this.authenticateConnection(ws, data);
          break;
        
        case 'join-room':
          await this.handleJoinRoom(ws, data);
          break;
        
        case 'leave-room':
          this.handleLeaveRoom(ws, data);
          break;
        
        case 'game-update':
          await this.handleGameUpdate(ws, data);
          break;
        
        case 'sync-request':
          await this.handleSyncRequest(ws, data);
          break;
        
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  }

  private async authenticateConnection(ws: AuthenticatedWebSocket, data: any) {
    const { token } = data;
    
    if (!token) {
      ws.send(JSON.stringify({
        type: 'auth-error',
        message: 'Authentication token required'
      }));
      return;
    }

    const tokenData = verifyRoomToken(token);
    if (!tokenData) {
      ws.send(JSON.stringify({
        type: 'auth-error',
        message: 'Invalid or expired token'
      }));
      return;
    }

    ws.userId = tokenData.userId;
    ws.isAuthenticated = true;

    ws.send(JSON.stringify({
      type: 'auth-success',
      userId: tokenData.userId
    }));
  }

  private async handleJoinRoom(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.isAuthenticated || !ws.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication required'
      }));
      return;
    }

    const { roomId, gameStateId, pointsGameId } = data;
    
    if (!roomId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room ID required'
      }));
      return;
    }

    // Remove from previous room if any
    if (ws.roomId) {
      this.removeFromRoom(ws, ws.roomId);
    }

    // Add to new room
    ws.roomId = roomId;
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    
    const room = this.rooms.get(roomId)!;
    room.set(ws.userId, {
      ws,
      userId: ws.userId,
      joinedAt: new Date()
    });

    // Persist room state
    await this.persistRoomState(roomId, gameStateId, pointsGameId);

    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      userId: ws.userId,
      timestamp: new Date().toISOString()
    }, ws.userId);

    ws.send(JSON.stringify({
      type: 'room-joined',
      roomId,
      memberCount: room.size
    }));
  }

  private handleLeaveRoom(ws: AuthenticatedWebSocket, data: any) {
    if (ws.roomId) {
      this.removeFromRoom(ws, ws.roomId);
    }
  }

  private removeFromRoom(ws: AuthenticatedWebSocket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && ws.userId) {
      room.delete(ws.userId);
      
      if (room.size === 0) {
        this.rooms.delete(roomId);
      } else {
        // Notify remaining members
        this.broadcastToRoom(roomId, {
          type: 'user-left',
          userId: ws.userId,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    ws.roomId = undefined;
  }

  private async handleGameUpdate(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.isAuthenticated || !ws.roomId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication and room membership required'
      }));
      return;
    }

    // Persist the update
    if (data.gameStateId || data.pointsGameId) {
      await this.persistRoomState(ws.roomId, data.gameStateId, data.pointsGameId, data.state);
    }

    // Broadcast to room members
    this.broadcastToRoom(ws.roomId, {
      type: 'game-update',
      ...data,
      timestamp: new Date().toISOString()
    }, ws.userId);
  }

  private async handleSyncRequest(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.isAuthenticated || !ws.roomId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication and room membership required'
      }));
      return;
    }

    // Get persisted room state
    const roomState = await storage.getRoomState(ws.roomId);
    
    if (roomState) {
      ws.send(JSON.stringify({
        type: 'sync-response',
        state: roomState.state,
        timestamp: new Date().toISOString()
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'sync-response',
        state: null,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private async persistRoomState(roomId: string, gameStateId?: string, pointsGameId?: string, state?: any) {
    try {
      await storage.upsertRoomState({
        roomId,
        gameStateId: gameStateId || null,
        pointsGameId: pointsGameId || null,
        state: state || {},
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error persisting room state:', error);
    }
  }

  private broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    room.forEach((connection, userId) => {
      if (userId !== excludeUserId && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(messageStr);
      }
    });
  }

  private handleDisconnection(ws: AuthenticatedWebSocket) {
    this.clearHeartbeat(ws);
    
    if (ws.roomId) {
      this.removeFromRoom(ws, ws.roomId);
    }
  }

  private cleanupInactiveRooms() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    this.rooms.forEach((room, roomId) => {
      // Remove connections that are no longer open
      room.forEach((connection, userId) => {
        if (connection.ws.readyState !== WebSocket.OPEN) {
          room.delete(userId);
        }
      });
      
      // Remove empty rooms or rooms with very old connections
      if (room.size === 0) {
        this.rooms.delete(roomId);
      } else {
        const allInactive = Array.from(room.values()).every(connection => 
          now.getTime() - connection.joinedAt.getTime() > inactiveThreshold
        );
        
        if (allInactive) {
          // Close all connections and remove room
          room.forEach(connection => {
            if (connection.ws.readyState === WebSocket.OPEN) {
              connection.ws.close();
            }
          });
          this.rooms.delete(roomId);
        }
      }
    });
  }

  public getRoomStats() {
    return {
      totalRooms: this.rooms.size,
      totalConnections: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.size, 0),
      rooms: Array.from(this.rooms.entries()).map(([roomId, room]) => ({
        roomId,
        memberCount: room.size,
        members: Array.from(room.values()).map(conn => ({
          userId: conn.userId,
          joinedAt: conn.joinedAt
        }))
      }))
    };
  }
}