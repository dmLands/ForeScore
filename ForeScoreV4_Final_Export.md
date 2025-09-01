# ForeScoreV4 - Final Complete Codebase Export

**Export Date:** January 5, 2025  
**Version:** ForeScoreV4 Final - Proportional Share Algorithm with Corrected Documentation

## Project Overview
ForeScore V4 Final is the complete full-stack card game companion application for the golf penalty game "Animal." This final version features the mathematically balanced Proportional Share Algorithm, consistent gray styling across all card tiles, proper game isolation, and corrected export documentation that accurately reflects the live database schema.

## Key V4 Final Features
- **Proportional Share Algorithm**: Player with highest debt gets no payout; others receive proportional shares based on advantage over worst player
- **Consistent Gray Styling**: All unassigned card tiles use bg-gray-50 border-gray-200 for visual consistency
- **Proper Game Isolation**: Each points game maintains separate holes/points data structure for complete game separation
- **Real-time Multiplayer**: WebSocket synchronization across all devices with room-based connections
- **2/9/16 Points Game**: Complete scoring system with hole-by-hole entry and automatic point calculation
- **Mobile-First Design**: Responsive UI with tabbed navigation optimized for mobile devices
- **Custom Cards**: User-defined penalty cards with emoji, names, and custom values
- **Payment Calculations**: Individual payouts and comprehensive "Who Owes Who" matrix
- **Corrected Documentation**: Export now accurately reflects the actual database schema

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js + TypeScript + Drizzle ORM with PostgreSQL
- **Database**: PostgreSQL (Neon Database) with proper schema design
- **Real-time**: WebSocket connections with game room synchronization
- **State Management**: TanStack Query for server state management

## Proportional Share Algorithm Details
**Mathematical Formula:**
1. Calculate total pot: sum of all player debts
2. Find maximum debt among all players
3. Calculate each player's advantage: (max debt - their debt)
4. Calculate total advantages: sum of all player advantages
5. Proportional share = (player advantage ÷ total advantages) × total pot
6. Net payout = share - own debt
7. Player with highest debt automatically gets 0 share
8. System mathematically balances to exactly $0 total

**Key Properties:**
- No player pays more than their debt
- Total payouts always sum to zero
- Proportional distribution based on debt advantage
- Mathematically stable and balanced

## Database Schema (Corrected)
The points game system uses the following correct schema structure:

```typescript
export const pointsGames = pgTable('points_games', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  name: varchar('name').notNull(),
  holes: jsonb('holes').$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> strokes
  points: jsonb('points').$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> points
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Game Isolation:**
- Each points game maintains its own `holes` and `points` data
- Scores only apply to their specific game instance
- No cross-game data contamination
- Proper separation of game sessions

---

## Complete File Structure and Code

### Package Configuration

#### package.json
```json
{
  "name": "forescore-v4",
  "private": true,
  "version": "4.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@neondatabase/serverless": "^0.9.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@tanstack/react-query": "^5.17.15",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "cmdk": "^0.2.1",
    "connect-pg-simple": "^9.0.1",
    "date-fns": "^3.3.1",
    "drizzle-orm": "^0.29.3",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.0.0",
    "express": "^4.18.2",
    "express-session": "^1.18.0",
    "framer-motion": "^11.0.3",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.314.0",
    "memoizee": "^0.4.15",
    "memorystore": "^1.6.7",
    "next-themes": "^0.2.1",
    "openid-client": "^5.6.4",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.2.0",
    "react-day-picker": "^8.10.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.49.3",
    "react-icons": "^5.0.1",
    "react-resizable-panels": "^2.0.11",
    "recharts": "^2.12.2",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^0.3.1",
    "vaul": "^0.9.0",
    "wouter": "^3.0.0",
    "ws": "^8.16.0",
    "zod": "^3.22.4",
    "zod-validation-error": "^2.1.0"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^1.0.2",
    "@replit/vite-plugin-runtime-error-modal": "^1.0.0",
    "@tailwindcss/typography": "^0.5.10",
    "@tailwindcss/vite": "^4.0.0-alpha.15",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/memoizee": "^0.4.11",
    "@types/node": "^20.11.5",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@types/ws": "^8.5.10",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "drizzle-kit": "^0.20.13",
    "esbuild": "^0.19.11",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.11"
  }
}
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["client/src", "server", "shared"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { replitCartographer } from "@replit/vite-plugin-cartographer";
import { replitRuntimeErrorModal } from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    replitCartographer(),
    replitRuntimeErrorModal()
  ],
  root: "client",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
```

#### drizzle.config.ts
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

#### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### Database Schema

#### shared/schema.ts
```typescript
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  players: json("players").$type<Player[]>().notNull(),
  cardValues: json("card_values").$type<CardValues>().notNull().default({
    camel: 2,
    fish: 2,
    roadrunner: 2,
    ghost: 2,
    skunk: 2,
    snake: 2,
    yeti: 2
  }),
  customCards: json("custom_cards").$type<CustomCard[]>().notNull().default([]),
  groupPhoto: text("group_photo"), // base64 image data
  shareCode: varchar("share_code", { length: 8 }).unique(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastPlayed: timestamp("last_played"),
});

export const gameStates = pgTable("game_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  name: text("name").notNull().default("Game"),
  deck: json("deck").$type<Card[]>().notNull(),
  playerCards: json("player_cards").$type<Record<string, Card[]>>().notNull(),
  cardHistory: json("card_history").$type<CardAssignment[]>().notNull().default([]),
  currentCard: json("current_card").$type<Card | null>(),
  isActive: integer("is_active").notNull().default(1),
  shareCode: varchar("share_code", { length: 8 }).unique(),
  cardValues: json("card_values").$type<CardValues>().notNull().default({
    camel: 2, fish: 2, roadrunner: 2, ghost: 2, skunk: 2, snake: 2, yeti: 2
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Types
export interface Player {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface Card {
  id: string;
  type: 'camel' | 'fish' | 'roadrunner' | 'ghost' | 'skunk' | 'snake' | 'yeti' | 'custom';
  emoji: string;
  name?: string; // For custom cards
}

export interface CustomCard {
  id: string;
  name: string;
  emoji: string;
  value: number;
}

export interface CardValues {
  camel: number;
  fish: number;
  roadrunner: number;
  ghost: number;
  skunk: number;
  snake: number;
  yeti: number;
  [key: string]: number; // For custom cards
}

export interface CardAssignment {
  id: string;
  cardId: string;
  playerId: string;
  cardType: Card['type'];
  cardName?: string;
  cardEmoji: string;
  playerName: string;
  playerColor: string;
  value: number;
  timestamp: string;
}

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).omit({
  id: true,
  createdAt: true,
});


export const playerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  initials: z.string().min(1).max(3),
  color: z.string().default("#0EA5E9"),
});

export const cardValuesSchema = z.object({
  camel: z.number().min(0),
  fish: z.number().min(0),
  roadrunner: z.number().min(0),
  ghost: z.number().min(0),
  skunk: z.number().min(0),
  snake: z.number().min(0),
  yeti: z.number().min(0),
}).catchall(z.number().min(0)); // Allow custom card values

// Types
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type GameState = typeof gameStates.$inferSelect;

// Points Game Tables
export const pointsGames = pgTable("points_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  holes: jsonb("holes").$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> strokes
  points: jsonb("points").$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> points
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPointsGameSchema = createInsertSchema(pointsGames).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PointsGame = typeof pointsGames.$inferSelect;
export type InsertPointsGame = z.infer<typeof insertPointsGameSchema>;
```

### Backend Implementation

#### server/index.ts
```typescript
import express from 'express';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { neon } from '@neondatabase/serverless';
import routes from './routes.js';
import { setupVite, serveStatic } from './vite.js';

const app = express();
const server = createServer(app);

// Database connection
const sql = neon(process.env.DATABASE_URL!);

// Session configuration
const PgSession = ConnectPgSimple(session);
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

app.use(express.json());

// WebSocket setup
const wss = new WebSocketServer({ server });
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'join-room') {
        if (currentRoom) {
          const oldRoom = rooms.get(currentRoom);
          if (oldRoom) {
            oldRoom.delete(ws);
            if (oldRoom.size === 0) {
              rooms.delete(currentRoom);
            }
          }
        }
        
        currentRoom = data.roomId;
        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Set());
        }
        rooms.get(currentRoom).add(ws);
        
        ws.send(JSON.stringify({ type: 'room-joined', roomId: currentRoom }));
      } else if (data.type === 'game-update' && currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(JSON.stringify(data));
            }
          });
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

// API routes
app.use('/api', routes);

// Vite setup for development/production
if (process.env.NODE_ENV === 'production') {
  serveStatic(app);
} else {
  setupVite(app);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### server/db.ts
```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

#### server/storage.ts
```typescript
import { db } from './db.js';
import { groups, gameStates, pointsGames, type InsertGroup, type InsertGameState, type InsertPointsGame, type Group, type GameState, type PointsGame } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface IStorage {
  // Groups
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: string): Promise<Group | null>;
  getAllGroups(): Promise<Group[]>;
  updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | null>;
  deleteGroup(id: string): Promise<boolean>;

  // Game States
  createGameState(gameState: InsertGameState): Promise<GameState>;
  getGameState(id: string): Promise<GameState | null>;
  getGameStateByGroupId(groupId: string): Promise<GameState | null>;
  updateGameState(id: string, updates: Partial<InsertGameState>): Promise<GameState | null>;
  deleteGameState(id: string): Promise<boolean>;

  // Points Games
  createPointsGame(pointsGame: InsertPointsGame): Promise<PointsGame>;
  getPointsGame(id: string): Promise<PointsGame | null>;
  getPointsGamesByGroupId(groupId: string): Promise<PointsGame[]>;
  updatePointsGame(id: string, updates: Partial<InsertPointsGame>): Promise<PointsGame | null>;
  deletePointsGame(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // Groups
  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async getGroup(id: string): Promise<Group | null> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || null;
  }

  async getAllGroups(): Promise<Group[]> {
    return await db.select().from(groups).orderBy(desc(groups.createdAt));
  }

  async updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | null> {
    const [updatedGroup] = await db
      .update(groups)
      .set(updates)
      .where(eq(groups.id, id))
      .returning();
    return updatedGroup || null;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const result = await db.delete(groups).where(eq(groups.id, id));
    return result.rowCount > 0;
  }

  // Game States
  async createGameState(gameState: InsertGameState): Promise<GameState> {
    const [newGameState] = await db.insert(gameStates).values(gameState).returning();
    return newGameState;
  }

  async getGameState(id: string): Promise<GameState | null> {
    const [gameState] = await db.select().from(gameStates).where(eq(gameStates.id, id));
    return gameState || null;
  }

  async getGameStateByGroupId(groupId: string): Promise<GameState | null> {
    const [gameState] = await db
      .select()
      .from(gameStates)
      .where(and(eq(gameStates.groupId, groupId), eq(gameStates.isActive, 1)))
      .orderBy(desc(gameStates.createdAt));
    return gameState || null;
  }

  async updateGameState(id: string, updates: Partial<InsertGameState>): Promise<GameState | null> {
    const [updatedGameState] = await db
      .update(gameStates)
      .set(updates)
      .where(eq(gameStates.id, id))
      .returning();
    return updatedGameState || null;
  }

  async deleteGameState(id: string): Promise<boolean> {
    const result = await db.delete(gameStates).where(eq(gameStates.id, id));
    return result.rowCount > 0;
  }

  // Points Games
  async createPointsGame(pointsGame: InsertPointsGame): Promise<PointsGame> {
    const [newPointsGame] = await db.insert(pointsGames).values(pointsGame).returning();
    return newPointsGame;
  }

  async getPointsGame(id: string): Promise<PointsGame | null> {
    const [pointsGame] = await db.select().from(pointsGames).where(eq(pointsGames.id, id));
    return pointsGame || null;
  }

  async getPointsGamesByGroupId(groupId: string): Promise<PointsGame[]> {
    return await db
      .select()
      .from(pointsGames)
      .where(eq(pointsGames.groupId, groupId))
      .orderBy(desc(pointsGames.createdAt));
  }

  async updatePointsGame(id: string, updates: Partial<InsertPointsGame>): Promise<PointsGame | null> {
    const [updatedPointsGame] = await db
      .update(pointsGames)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pointsGames.id, id))
      .returning();
    return updatedPointsGame || null;
  }

  async deletePointsGame(id: string): Promise<boolean> {
    const result = await db.delete(pointsGames).where(eq(pointsGames.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DbStorage();
```

#### server/routes.ts
```typescript
import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage.js';
import { insertGroupSchema, insertGameStateSchema, insertPointsGameSchema, type Card, type CardAssignment } from '@shared/schema';

const router = Router();

// Groups endpoints
router.get('/groups', async (req, res) => {
  try {
    const groups = await storage.getAllGroups();
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

router.get('/groups/:id', async (req, res) => {
  try {
    const group = await storage.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Failed to fetch group' });
  }
});

router.post('/groups', async (req, res) => {
  try {
    const validatedData = insertGroupSchema.parse(req.body);
    const group = await storage.createGroup(validatedData);
    res.status(201).json(group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group' });
  }
});

router.patch('/groups/:id', async (req, res) => {
  try {
    const updates = insertGroupSchema.partial().parse(req.body);
    const group = await storage.updateGroup(req.params.id, updates);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json(group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Failed to update group' });
  }
});

router.delete('/groups/:id', async (req, res) => {
  try {
    const success = await storage.deleteGroup(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Failed to delete group' });
  }
});

// Game states endpoints
router.get('/game-state/:id', async (req, res) => {
  try {
    const gameState = await storage.getGameState(req.params.id);
    if (!gameState) {
      return res.status(404).json({ message: 'Game state not found' });
    }
    res.json(gameState);
  } catch (error) {
    console.error('Error fetching game state:', error);
    res.status(500).json({ message: 'Failed to fetch game state' });
  }
});

router.get('/groups/:groupId/game-state', async (req, res) => {
  try {
    const gameState = await storage.getGameStateByGroupId(req.params.groupId);
    if (!gameState) {
      return res.status(404).json({ message: 'Game state not found' });
    }
    res.json(gameState);
  } catch (error) {
    console.error('Error fetching game state:', error);
    res.status(500).json({ message: 'Failed to fetch game state' });
  }
});

router.post('/game-state', async (req, res) => {
  try {
    const validatedData = insertGameStateSchema.parse(req.body);
    const gameState = await storage.createGameState(validatedData);
    res.status(201).json(gameState);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating game state:', error);
    res.status(500).json({ message: 'Failed to create game state' });
  }
});

// Card assignment endpoint
router.post('/game-state/:id/assign-card', async (req, res) => {
  try {
    const { cardId, playerId } = req.body;
    
    if (!cardId || !playerId) {
      return res.status(400).json({ message: 'Card ID and Player ID are required' });
    }

    const gameState = await storage.getGameState(req.params.id);
    if (!gameState) {
      return res.status(404).json({ message: 'Game state not found' });
    }

    // Find the card in the deck
    const cardIndex = gameState.deck.findIndex((card: Card) => card.id === cardId);
    if (cardIndex === -1) {
      return res.status(400).json({ message: 'Card not found in deck' });
    }

    const card = gameState.deck[cardIndex];
    
    // Remove card from deck
    const newDeck = [...gameState.deck];
    newDeck.splice(cardIndex, 1);

    // Add card to player's cards
    const newPlayerCards = { ...gameState.playerCards };
    if (!newPlayerCards[playerId]) {
      newPlayerCards[playerId] = [];
    }
    newPlayerCards[playerId] = [...newPlayerCards[playerId], card];

    // Get group to find player info
    const group = await storage.getGroup(gameState.groupId);
    const player = group?.players.find(p => p.id === playerId);
    
    if (!player) {
      return res.status(400).json({ message: 'Player not found' });
    }

    // Get card value
    const cardValue = card.type === 'custom' 
      ? group?.customCards.find(c => c.id === card.id)?.value || 0
      : gameState.cardValues[card.type] || 0;

    // Create card assignment record
    const assignment: CardAssignment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cardId: card.id,
      playerId: player.id,
      cardType: card.type,
      cardName: card.name,
      cardEmoji: card.emoji,
      playerName: player.name,
      playerColor: player.color,
      value: cardValue,
      timestamp: new Date().toISOString()
    };

    // Add to card history
    const newCardHistory = [...gameState.cardHistory, assignment];

    // Update game state
    const updatedGameState = await storage.updateGameState(req.params.id, {
      deck: newDeck,
      playerCards: newPlayerCards,
      cardHistory: newCardHistory,
      currentCard: card
    });

    res.json(updatedGameState);
  } catch (error) {
    console.error('Error assigning card:', error);
    res.status(500).json({ message: 'Failed to assign card' });
  }
});

// Shuffle deck endpoint
router.post('/game-state/:id/shuffle', async (req, res) => {
  try {
    const gameState = await storage.getGameState(req.params.id);
    if (!gameState) {
      return res.status(404).json({ message: 'Game state not found' });
    }

    // Shuffle the deck using Fisher-Yates algorithm
    const newDeck = [...gameState.deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    const updatedGameState = await storage.updateGameState(req.params.id, {
      deck: newDeck
    });

    res.json(updatedGameState);
  } catch (error) {
    console.error('Error shuffling deck:', error);
    res.status(500).json({ message: 'Failed to shuffle deck' });
  }
});

// Points Games endpoints
router.get('/groups/:groupId/games', async (req, res) => {
  try {
    const games = await storage.getPointsGamesByGroupId(req.params.groupId);
    res.json(games);
  } catch (error) {
    console.error('Error fetching points games:', error);
    res.status(500).json({ message: 'Failed to fetch points games' });
  }
});

router.get('/games/:id', async (req, res) => {
  try {
    const game = await storage.getPointsGame(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Points game not found' });
    }
    res.json(game);
  } catch (error) {
    console.error('Error fetching points game:', error);
    res.status(500).json({ message: 'Failed to fetch points game' });
  }
});

router.post('/games', async (req, res) => {
  try {
    const validatedData = insertPointsGameSchema.parse(req.body);
    const game = await storage.createPointsGame(validatedData);
    res.status(201).json(game);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating points game:', error);
    res.status(500).json({ message: 'Failed to create points game' });
  }
});

router.patch('/games/:id', async (req, res) => {
  try {
    const updates = insertPointsGameSchema.partial().parse(req.body);
    const game = await storage.updatePointsGame(req.params.id, updates);
    if (!game) {
      return res.status(404).json({ message: 'Points game not found' });
    }
    res.json(game);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error updating points game:', error);
    res.status(500).json({ message: 'Failed to update points game' });
  }
});

router.delete('/games/:id', async (req, res) => {
  try {
    const success = await storage.deletePointsGame(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Points game not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting points game:', error);
    res.status(500).json({ message: 'Failed to delete points game' });
  }
});

// Update hole scores endpoint
router.post('/games/:gameId/holes/:hole/scores', async (req, res) => {
  try {
    const { gameId, hole } = req.params;
    const { scores } = req.body; // scores: { playerId: strokes }
    
    const game = await storage.getPointsGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Points game not found' });
    }

    // Update holes data
    const newHoles = { ...game.holes };
    newHoles[parseInt(hole)] = scores;

    // Calculate points for this hole based on 2/9/16 system
    const newPoints = { ...game.points };
    const holeScores = Object.entries(scores).map(([playerId, strokes]) => ({
      playerId,
      strokes: strokes as number
    }));

    // Sort by strokes to determine points
    holeScores.sort((a, b) => a.strokes - b.strokes);
    
    const holePoints: Record<string, number> = {};
    holeScores.forEach((score, index) => {
      if (index === 0) {
        holePoints[score.playerId] = 2; // Best score gets 2 points
      } else if (index === holeScores.length - 1) {
        holePoints[score.playerId] = 16; // Worst score gets 16 points
      } else {
        holePoints[score.playerId] = 9; // Middle scores get 9 points
      }
    });

    newPoints[parseInt(hole)] = holePoints;

    const updatedGame = await storage.updatePointsGame(gameId, {
      holes: newHoles,
      points: newPoints
    });

    res.json(updatedGame);
  } catch (error) {
    console.error('Error updating hole scores:', error);
    res.status(500).json({ message: 'Failed to update hole scores' });
  }
});

export default router;
```

#### server/vite.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setupVite(app: any) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.resolve(__dirname, '../client'),
  });

  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);
}

export function serveStatic(app: any) {
  const clientPath = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientPath));
  
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(clientPath, 'index.html'));
  });
}
```

---

## Frontend Implementation

Due to the length constraints of this export, the complete frontend implementation includes:

### Key Frontend Files:
- **client/src/App.tsx**: Main application component with routing
- **client/src/main.tsx**: Application entry point
- **client/src/pages/home.tsx**: Primary game interface with all tabs
- **client/src/hooks/use-websocket.ts**: WebSocket connection management
- **client/src/hooks/use-game-state.ts**: Game state management
- **client/src/lib/queryClient.ts**: TanStack Query configuration
- **client/src/components/ui/***: Complete shadcn/ui component library
- **client/index.html**: HTML entry point

### Key Frontend Features:
1. **Tabbed Navigation**: Groups, Deck, Scoreboard, Rules, # (2/9/16 Game)
2. **Proportional Share Algorithm**: Implemented in Card Game Payouts sections
3. **Real-time Synchronization**: WebSocket integration for multi-device support
4. **Mobile-First Design**: Responsive layout optimized for mobile devices
5. **Consistent Styling**: Gray formatting (bg-gray-50 border-gray-200) for unassigned cards
6. **Interactive Tutorial**: 7-step guided tour for new users
7. **Points Game System**: Complete 2/9/16 scoring with hole-by-hole entry

---

## Key Implementation Notes

### Proportional Share Algorithm
The algorithm is implemented in the Card Game Payouts sections of both Deck and Scoreboard tabs. The calculation ensures mathematical balance and prevents any player from paying more than their debt.

### Database Design
The corrected schema uses `holes` and `points` JSONB fields for proper game isolation, ensuring each points game maintains its own separate data structure.

### Real-time Features
WebSocket implementation provides room-based synchronization, allowing multiple devices to stay connected to the same game session with automatic updates.

### Mobile Optimization
The entire interface is designed mobile-first with touch-friendly controls, appropriate sizing, and responsive layouts that work seamlessly across devices.

---

This completes the ForeScore V4 Final export with all corrections and the accurate representation of the live application schema and functionality.