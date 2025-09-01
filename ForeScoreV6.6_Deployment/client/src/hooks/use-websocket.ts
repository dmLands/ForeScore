import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket(groupId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Join the room for this group
        ws.send(JSON.stringify({
          type: 'joinRoom',
          groupId: groupId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'gameStateUpdate') {
            // Force immediate refresh of all related data
            queryClient.invalidateQueries({ queryKey: ['/api/game-state', groupId] });
            queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'games'] });
            queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
            queryClient.refetchQueries({ queryKey: ['/api/game-state', groupId] });
            queryClient.refetchQueries({ queryKey: ['/api/groups', groupId, 'games'] });
          } else if (data.type === 'pointsGameUpdate') {
            // Handle points game updates
            queryClient.invalidateQueries({ queryKey: ['/api/points-games', groupId] });
            queryClient.refetchQueries({ queryKey: ['/api/points-games', groupId] });
          } else if (data.type === 'groupUpdate') {
            // Handle group updates
            queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
            queryClient.refetchQueries({ queryKey: ['/api/groups'] });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [groupId, queryClient]);

  return { isConnected };
}