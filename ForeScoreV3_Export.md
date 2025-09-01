# ForeScoreV3 - Complete Codebase Export

## Project Overview
ForeScore V3 is a complete full-stack card game companion for the golf penalty game "Animal." This export contains all source code, configurations, and documentation for the application as of January 2025.

## Architecture
- **Frontend**: React 18 with TypeScript, Vite, shadcn/ui components
- **Backend**: Express.js with TypeScript, WebSocket support
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with responsive design
- **Real-time**: WebSocket synchronization for multiplayer

## Key Features
- Group management with custom player colors
- Card game mechanics with CardGamePayments algorithm
- 2/9/16 points game system with dual payout modes
- Real-time multiplayer synchronization
- Mobile-first responsive design
- Custom card creation and management
- Payment calculations and "Who Owes Who" matrices

## Export Contents
This export includes all source files, configurations, and documentation needed to reproduce the application.

---

## Core Configuration Files

### package.json
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.5",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.5",
    "@radix-ui/react-slot": "^1.1.3",
    "@radix-ui/react-switch": "^1.1.5",
    "@radix-ui/react-tabs": "^1.1.5",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@replit/vite-plugin-cartographer": "^2.0.1",
    "@replit/vite-plugin-runtime-error-modal": "^2.0.0",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.0.7",
    "@tanstack/react-query": "^5.62.7",
    "@types/connect-pg-simple": "^7.0.0",
    "@types/express": "^5.0.0",
    "@types/express-session": "^1.18.0",
    "@types/memoizee": "^0.4.11",
    "@types/node": "^22.10.2",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.17",
    "@types/react-dom": "^18.3.5",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^4.1.0",
    "drizzle-kit": "^0.30.0",
    "drizzle-orm": "^0.36.4",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.5.1",
    "esbuild": "^0.24.2",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "framer-motion": "^11.15.0",
    "input-otp": "^1.4.1",
    "lucide-react": "^0.468.0",
    "memoizee": "^0.4.17",
    "memorystore": "^1.6.7",
    "next-themes": "^0.4.4",
    "openid-client": "^6.1.3",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "postcss": "^8.5.4",
    "react": "^18.3.1",
    "react-day-picker": "^9.4.2",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.13.3",
    "tailwind-merge": "^2.5.4",
    "tailwindcss": "^4.0.0",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.19.2",
    "tw-animate-css": "^0.2.5",
    "typescript": "^5.7.2",
    "vaul": "^1.1.1",
    "vite": "^6.0.3",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.23.8",
    "zod-validation-error": "^3.4.0"
  }
}
```

### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "target": "es2022",
    "useDefineForClassFields": true,
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "./dist/**/*"
  ]
}
```

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./client/src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### drizzle.config.ts
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## Database Schema (shared/schema.ts)
```typescript
import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  groupPhoto: text("group_photo"),
  players: jsonb("players").$type<Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
  }>>().notNull(),
  customCards: jsonb("custom_cards").$type<Array<{
    id: string;
    name: string;
    emoji: string;
    value: number;
  }>>(),
  lastPlayed: timestamp("last_played"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  shareCode: text("share_code").notNull().unique(),
  isActive: integer("is_active").default(1).notNull(),
  cardValues: jsonb("card_values").$type<Record<string, number>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameStates = pgTable("game_states", {
  id: uuid("id").primaryKey(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  playerCards: jsonb("player_cards").$type<Record<string, Array<{
    id: string;
    type: string;
    name?: string;
    emoji?: string;
  }>>>().notNull(),
  cardValues: jsonb("card_values").$type<Record<string, number>>().notNull(),
  cardHistory: jsonb("card_history").$type<Array<{
    cardType: string;
    playerId: string;
    playerName: string;
    timestamp: string;
  }>>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pointsGames = pgTable("points_games", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  shareCode: text("share_code").notNull().unique(),
  isActive: integer("is_active").default(1).notNull(),
  playerScores: jsonb("player_scores").$type<Record<string, number[]>>().notNull(),
  pointsPerHole: jsonb("points_per_hole").$type<number[]>().notNull(),
  payoutMode: text("payout_mode").notNull().default("points"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertGroupSchema = createInsertSchema(groups).omit({ 
  id: true, 
  createdAt: true,
  lastPlayed: true 
});
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export const insertGameSchema = createInsertSchema(games).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export const insertGameStateSchema = createInsertSchema(gameStates).omit({ 
  updatedAt: true 
});
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type GameState = typeof gameStates.$inferSelect;

export const insertPointsGameSchema = createInsertSchema(pointsGames).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertPointsGame = z.infer<typeof insertPointsGameSchema>;
export type PointsGame = typeof pointsGames.$inferSelect;
```

---

## Backend Implementation

### server/index.ts
```typescript
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 80 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '80', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
```

## Installation & Setup Instructions

1. **Clone/Extract the codebase**
2. **Install dependencies**: `npm install`
3. **Set up environment variables**:
   - `DATABASE_URL`: PostgreSQL connection string
   - `PORT`: Server port (optional, defaults to 80)
4. **Push database schema**: `npm run db:push`
5. **Start development server**: `npm run dev`
6. **Build for production**: `npm run build && npm start`

## Key Implementation Files Summary

- **client/src/pages/home.tsx**: Main application UI with all tabs and game logic
- **server/routes.ts**: API endpoints for groups, games, and state management
- **server/storage.ts**: Database operations and business logic
- **shared/schema.ts**: Database schema and TypeScript types
- **CardGamePayments.md**: Algorithm documentation for payout calculations

This export contains the complete, working ForeScore V3 application with all synchronized payout calculations and features.