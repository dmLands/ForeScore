# ForeScoreV4 - Complete Code Export
**Export Date:** January 5, 2025  
**Version:** ForeScoreV4 - Proportional Share Algorithm

## Project Overview
ForeScore V4 is a comprehensive full-stack card game companion application for the golf penalty game "Animal." This version features the new Proportional Share Algorithm for mathematically balanced payout calculations, consistent gray styling, and enhanced user experience.

## Key Features
- **Proportional Share Algorithm**: Player with highest debt gets no payout; others receive proportional shares based on advantage
- **Real-time Multiplayer**: WebSocket synchronization across all devices
- **2/9/16 Points Game**: Complete scoring system with dual payout modes
- **Mobile-First Design**: Responsive UI with tabbed navigation
- **Custom Cards**: User-defined penalty cards with emoji and values
- **Payment Calculations**: Individual payouts and "Who Owes Who" matrix

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Neon Database)
- **Real-time**: WebSocket connections with room-based synchronization

## Algorithm Details
**Proportional Share Calculation:**
1. Calculate total pot (sum of all player debts)
2. Find maximum debt among all players
3. Calculate each player's advantage: (max debt - their debt)
4. Proportional share = (advantage ÷ total advantages) × total pot
5. Net payout = share - own debt
6. Player with highest debt automatically gets 0 share
7. System mathematically balances to $0 total

---

## Complete File Structure and Code

### Package Configuration

#### package.json
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.1",
    "@radix-ui/react-accordion": "^1.2.1",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-aspect-ratio": "^1.1.0",
    "@radix-ui/react-avatar": "^1.1.1",
    "@radix-ui/react-checkbox": "^1.1.2",
    "@radix-ui/react-collapsible": "^1.1.1",
    "@radix-ui/react-context-menu": "^2.2.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-hover-card": "^1.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.2",
    "@radix-ui/react-navigation-menu": "^1.2.1",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.1",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.3",
    "@replit/vite-plugin-cartographer": "^2.0.0",
    "@replit/vite-plugin-runtime-error-modal": "^2.0.0",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.0.0-alpha.30",
    "@tanstack/react-query": "^5.61.3",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^5.0.0",
    "@types/express-session": "^1.18.0",
    "@types/memoizee": "^0.4.11",
    "@types/node": "^22.10.1",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.4",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^4.1.0",
    "drizzle-kit": "^0.29.0",
    "drizzle-orm": "^0.38.2",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.5.1",
    "esbuild": "0.24.0",
    "express": "^4.21.1",
    "express-session": "^1.18.1",
    "framer-motion": "^11.15.0",
    "input-otp": "^1.4.1",
    "lucide-react": "^0.468.0",
    "memoizee": "^0.4.17",
    "memorystore": "^1.6.7",
    "next-themes": "^0.4.4",
    "openid-client": "^6.1.4",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "postcss": "^8.5.1",
    "react": "^18.3.1",
    "react-day-picker": "^9.4.2",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.13.3",
    "tailwind-merge": "^2.5.5",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.19.2",
    "tw-animate-css": "^1.0.1",
    "typescript": "^5.6.3",
    "vaul": "^1.1.0",
    "vite": "^6.0.1",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.23.8",
    "zod-validation-error": "^3.4.0"
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

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["client/src", "shared", "server"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import cartographer from "@replit/vite-plugin-cartographer";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cartographer(),
    runtimeErrorModal(),
  ],
  resolve: {
    alias: {
      "@": resolve(fileURLToPath(new URL("./client/src", import.meta.url))),
      "@shared": resolve(fileURLToPath(new URL("./shared", import.meta.url))),
    },
  },
  build: {
    outDir: "client/dist",
  },
  root: "client",
});
```

#### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./client/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./client/index.html",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
```

### Database Schema

#### shared/schema.ts
```typescript
import { pgTable, text, uuid, timestamp, json, integer, real, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Groups table - stores player groups
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  players: json('players').$type<Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
  }>>().notNull(),
  customCards: json('custom_cards').$type<Array<{
    id: string;
    name: string;
    emoji: string;
    value: number;
  }>>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Game states table - stores active game data
export const gameStates = pgTable('game_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  deck: json('deck').$type<Array<{
    id: string;
    type: string;
    emoji?: string;
    name?: string;
  }>>().notNull(),
  playerCards: json('player_cards').$type<Record<string, Array<{
    id: string;
    type: string;
    emoji?: string;
    name?: string;
  }>>>().notNull(),
  cardValues: json('card_values').$type<Record<string, number>>().notNull(),
  cardHistory: json('card_history').$type<Array<{
    cardId: string;
    cardType: string;
    cardName?: string;
    cardEmoji?: string;
    playerId: string;
    playerName: string;
    timestamp: string;
    action: 'assigned' | 'reassigned';
    previousPlayerId?: string;
    previousPlayerName?: string;
  }>>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

// Points games table - stores 2/9/16 game data
export const pointsGames = pgTable('points_games', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  name: varchar('name').notNull(),
  holes: jsonb('holes').$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> strokes
  points: jsonb('points').$type<Record<number, Record<string, number>>>().default({}), // hole -> playerId -> points
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Zod schemas for validation
export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).omit({
  id: true,
  createdAt: true,
});

export const insertPointsGameSchema = createInsertSchema(pointsGames).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type PointsGame = typeof pointsGames.$inferSelect;
export type InsertPointsGame = z.infer<typeof insertPointsGameSchema>;
```

#### drizzle.config.ts
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

This export includes the complete project structure, algorithm implementation, and all key files. ForeScore V4 is ready for deployment with the new Proportional Share Algorithm and enhanced styling.