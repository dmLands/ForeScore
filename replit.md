# ForeScoreV5 - Enterprise-Grade Security & Authentication

## Overview
ForeScore V5.20 is a secure, full-stack application designed as a companion for the golf penalty game "Animal." It provides enterprise-grade local authentication, server-side security validation, and enhanced payout visualization. The application supports complete group management, card game mechanics utilizing a Proportional Share Algorithm, isolated 2/9/16 points games per session, and multiple payout calculation views. All game calculations are performed server-side to prevent tampering, ensuring secure user authentication and session management. The project's vision is to offer a robust, reliable, and secure platform for managing golf penalty games, with ambitions to become the leading digital tool in this niche.

## User Preferences
I want iterative development. Ask before making major changes. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
- **Design Philosophy**: Mobile-first responsive design with tabbed navigation.
- **Color Scheme**: Consistent gray styling throughout the application, with specific elements like the "Calculate Payouts" button using an emerald green theme.
- **UI Components**: Utilizes shadcn/ui (Radix UI primitives) for accessible and professional-looking components.
- **Navigation**: Tabbed navigation (Groups, Deck, Scoreboard, Rules, 2/9/16 Game).
- **User Flow**: Clean landing page, hamburger menu for user profile and logout.
- **Tutorial**: Includes a comprehensive 7-step interactive tutorial.

### Technical Implementations
- **Authentication**: Local email/password authentication system with bcrypt password hashing and secure session management. User registration, login, and secure logout are implemented.
- **Security**: Server-side validation for all game calculations (Proportional Share Algorithm, 2/9/16 points) and card assignments to prevent client-side tampering. User data is isolated, ensuring each authenticated user has their own instance of groups, games, and points games. API endpoints are session-protected with proper authentication middleware.
- **Game Logic**:
    - **Excess Split Algorithm**: Server-validated payout where only excess debt above a minimum is redistributed evenly among players at the minimum debt level.
    - **2/9/16 Points Game**: Full scoring system with dual payout modes (Points/FBT) and server-side calculation for score integrity. Supports individual game session isolation.
    - **Combined Settlement**: Integrates card game and 2/9/16 payouts into optimized transactions, displayed in a "Who Owes Who - Combined" tile.
    - **Card Game Mechanics**: Supports player setup, unique colors, custom cards, card selection, assignment, and re-assignment with historical tracking.
- **Data Flow**: Manages group creation, game start, card actions, and state synchronization. A canonical calculation pipeline through `/api/calculate-combined-games` ensures a single source of truth for all payout calculations.
- **Real-time Synchronization**: Scalable WebSocket architecture for room-based real-time updates, though primarily used for production environments.

### Feature Specifications
- **Group Management**: Create and manage player groups (up to 4 players) with unique colors and custom cards.
- **2/9/16 Points Game**: Allows hole-by-hole entry, automatic point calculation, live leaderboard, and payout calculation with both "Points" and "FBT" (Front/Back/Total) modes. Enforces a single 2/9/16 game per group policy.
- **Custom Cards**: Users can define and manage custom penalty cards with associated emojis and values.
- **Payout Visualization**: Enhanced Payouts Tab with detailed visualizations for Card Game Payouts, Combined settlements, and dedicated Points/FBT tiles.

### System Design Choices
- **Frontend**: React 18 with TypeScript, Vite as build tool, Wouter for routing, TanStack Query for state management, React Hook Form with Zod for form handling.
- **Backend**: Express.js with TypeScript, Node.js with ESM modules.
- **Database**: PostgreSQL with Drizzle ORM (schema-first approach), utilizing Neon Database (serverless).
- **Authentication**: Integrates with Replit Auth for core authentication, supplemented by local email/password system for full control. Uses PostgreSQL for session storage.
- **API**: RESTful API with JSON responses, comprehensive authentication protection, and server-side logic for all critical calculations.
- **Code Organization**: All API endpoints are consolidated in `newRoutes.ts` for maintainability, eliminating legacy files.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL database connection.
- **drizzle-orm**: Database ORM and query builder.
- **@tanstack/react-query**: Server state management.
- **wouter**: Lightweight React router.
- **zod**: Runtime type validation.

### UI
- **@radix-ui/***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Component variant management.
- **lucide-react**: Icon library.