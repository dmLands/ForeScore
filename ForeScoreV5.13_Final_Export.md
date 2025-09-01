# ForeScoreV5.13 (ForeScore10.1) - Enterprise-Grade Security & Authentication

## Overview
This is the production-ready ForeScore V5.13 (ForeScore10.1) application - a secure, full-stack card game companion for the golf penalty game "Animal." Now featuring enterprise-grade local authentication, server-side security validation, and enhanced Payouts tab with comprehensive payout visualization. Built with React and Express, it provides complete group management, card game mechanics with the Proportional Share Algorithm, isolated 2/9/16 points games per session, and multiple payout calculation views. All game calculations run server-side to prevent tampering, with secure user authentication and session management.

## Version History
- **ForeScoreV1** (January 2025): Complete implementation with CardGamePayments method, ready for deployment
- **ForeScoreV2** (January 2025): Fixed syntax errors and app stability issues
- **ForeScoreV3** (January 2025): Synchronized Card Game Payouts across Deck/Scoreboard tabs, fixed Who Owes Who calculations
- **ForeScoreV4** (January 2025): Final version with Proportional Share Algorithm, consistent gray styling, and corrected export documentation
- **ForeScoreV5** (January 2025): **PRODUCTION READY** - Enterprise-grade Replit Auth, server-side security, scalable WebSocket architecture
- **ForeScoreV5.1** (August 2025): **DEPLOYMENT READY** - Fixed SecureWebSocketManager build compilation and deployment errors
- **ForeScoreV5.2** (August 2025): **PRODUCTION AUTH** - Complete local authentication system with user isolation, hamburger menu, and clean UI
- **ForeScoreV5.3** (August 2025): **COMPLETE USER ISOLATION** - Fixed all frontend/backend API alignment issues, card assignment works, 2/9/16 game creation works, comprehensive route completion
- **ForeScoreV5.4** (August 2025): **ALL CORE FEATURES WORKING** - Fixed custom card assignment by including custom cards in game deck initialization, resolved TypeScript compilation errors, verified all major functionality working
- **ForeScoreV5.5** (August 2025): **CORRECTED DEBT SETTLEMENT** - Fixed Proportional Share Algorithm to use Excess Split logic: only excess debt above minimum gets redistributed among players at minimum debt level
- **ForeScoreV5.6** (August 2025): **FIXED 2/9/16 SCORING** - Restored correct complex scoring logic with proper tie handling for all player count scenarios, replaced buggy simple ranking system with original working calculation
- **ForeScoreV5.7** (August 2025): **COMBINED SETTLEMENT COMPLETE** - Successfully implemented the critical "Who Owes Who - Combined" tile in Scoreboard tab with purple styling, complete debt settlement logic combining card game and 2/9/16 payouts into optimized transactions
- **ForeScoreV5.8** (August 2025): **UI REFINEMENT & NAVIGATION FIXES** - Removed "Back to Games" button from 2/9/16 game to preserve state, removed Round Stats tile, fixed Combined tile to use proper pay-up algorithm instead of simple summation, improved conditional tile display logic
- **ForeScoreV5.9** (August 2025): **COMPLETE 2/9/16 PERSISTENCE FIX** - Fixed critical routing issue where points games API routes were in unused routes.ts file; moved all endpoints to active newRoutes.ts, eliminated duplicate code, 2/9/16 games now display and persist correctly
- **ForeScoreV5.10** (August 2025): **ONE GAME PER GROUP POLICY** - Enforced single 2/9/16 game per group policy: cleaned up duplicate games in storage, removed "Create New" button for existing games, auto-select single game, server prevents multiple game creation
- **ForeScoreV5.11** (August 2025): **GAME SESSION ISOLATION** - Fixed critical scoping bug: 2/9/16 games now properly isolated per individual card game session (Group>Game) instead of sharing across all games in a group; added gameStateId field to pointsGames schema
- **ForeScoreV5.12** (August 2025): **COMPLETE ISOLATION FIX** - Cleaned up orphaned points games without gameStateId, added useEffect to clear selectedPointsGame when switching game sessions, enforced proper 2/9/16 game isolation per card game session
- **ForeScoreV5.13 (ForeScore10.1)** (August 2025): **ENHANCED PAYOUTS TAB** - Added Points Only and FBT Only tiles at bottom of Payouts tab with exact 2/9/16 calculation logic, dynamic descriptions for Combined tile based on dropdown selection, consistent gray styling throughout app, title changed to "Who Owes Who - 2/9/16 Games"

## Key Features Implemented
### Security & Authentication
- **Local Authentication System**: Complete email/password authentication with bcrypt password hashing
- **User Registration & Login**: Full-featured registration form with email, first name, last name, password validation
- **Server-Side Validation**: All game calculations and card assignments validated server-side to prevent tampering
- **User Data Isolation**: Each authenticated user gets their own data instance - groups, games, and points games are user-specific
- **Secure API Endpoints**: Session-protected routes with proper authentication middleware
- **Authenticated Sessions**: Express session management with secure cookie handling
- **Professional UI**: Clean landing page with "Log In" button and "New Users Register Here" link
- **Hamburger Menu**: User profile menu showing first name and secure logout functionality

### Game Features
- **Excess Split Algorithm**: Server-validated payout system where only excess debt above minimum gets redistributed evenly among players at minimum debt level
- **Group Management**: Complete player setup with unique colors and custom cards (user-owned)
- **2/9/16 Points Game**: Full scoring system with dual payout modes (Points/FBT)
- **Enhanced Payouts Tab**: Comprehensive payout visualization with Card Game Payouts at top, Combined tile with dynamic descriptions, and dedicated Points/FBT tiles at bottom
- **Scalable WebSocket**: Room-based real-time synchronization with token authentication (production-ready)
- **Mobile-First Design**: Responsive UI with tabbed navigation and professional landing page
- **Payment Calculations**: Multiple payout views including individual payouts, combined settlements, and isolated Points/FBT calculations
- **Card History**: Simple chronological tracking of all game events
- **Database Stability**: Robust connection pooling and error handling

## Technical Implementation Notes
### V5 Security Architecture
- **Authentication Flow**: Local email/password authentication with secure session management and PostgreSQL storage
- **Server-Side Logic**: All game calculations (Proportional Share, 2/9/16 points) run on server to prevent client tampering
- **Database Security**: User ownership enforced at database level with nullable createdBy fields for migration compatibility
- **API Security**: All endpoints protected with isAuthenticated middleware and proper error handling
- **Complete API Alignment**: Frontend and backend routes fully synchronized for card assignment, game creation, and points games
- **Token Management**: Secure JWT tokens for WebSocket authentication with signed payloads and expiry

### Game Logic Security
- **Excess Split Algorithm**: Server-validated - Players with excess debt above minimum pay their excess; players at minimum debt split the total excess evenly
- **Card Assignment Validation**: Server-side validation of all card assignments with player/deck verification
- **Points Calculation**: 2/9/16 points calculated server-side to prevent score manipulation
- **Advantage calculation**: (max debt - player debt); Share = (advantage / total advantages) × total pot
- **Database Isolation**: User-owned groups and games with proper access control

### Production Readiness
- **Authentication**: Enterprise-grade Replit Auth with automatic user provisioning
- **Scalability**: WebSocket manager supports room-based connections (disabled in dev, enabled in production)
- **Error Handling**: Comprehensive 401 handling with automatic login redirects
- **Session Management**: PostgreSQL session store with proper cleanup and security
- **Professional UI**: Landing page for unauthenticated users, secure header with user info and logout
- **Deployment Security**: Fixed SecureWebSocketManager compilation errors with proper import handling and graceful fallback initialization
- **Code Architecture**: Eliminated legacy routes.ts file; all API endpoints consolidated in newRoutes.ts for maintainability

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with CSS variables
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **Design**: Mobile-first with tabbed navigation, unique player colors, and a comprehensive 7-step interactive tutorial.

### Backend
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **Security**: JWT tokens, server-side validation, authenticated middleware
- **API Style**: RESTful API with JSON responses and comprehensive auth protection
- **Core Logic**: Secure server-side game calculations, user ownership tracking, and protected CRUD operations
- **WebSocket**: Scalable room-based real-time synchronization with token authentication

### Database
- **Type**: PostgreSQL
- **ORM**: Drizzle ORM (schema-first approach)
- **Migration Strategy**: Drizzle Kit
- **Provider**: Neon Database (serverless)
- **Security**: User ownership tracking with createdBy fields, session storage, automatic cleanup
- **Schema**: 
  - **Users**: Replit Auth user data (id, email, firstName, lastName, profileImageUrl)
  - **Sessions**: Secure session storage for authentication
  - **Groups**: User-owned game groups with players, colors, card values, and custom cards
  - **Game States**: User-owned active sessions with deck, player cards, and card history
  - **Points Games**: User-owned 2/9/16 games with holes and points data
  - **Room States**: Scalable WebSocket room management for real-time sync

### Key Features
- **Group Management**: Create and manage player groups (up to 4 players).
- **Card Game Mechanics**: Card selection, assignment, and re-assignment with historical tracking.
- **"2/9/16 Game"**: Points-based scoring with hole-by-hole entry, automatic point calculation, live leaderboard, and payout calculation.
- **Dual Payout Systems**: Toggle between "Points" and "FBT" (Front/Back/Total) payout modes.
- **Custom Cards**: Users can define and manage custom penalty cards with emoji and value.
- **User Interface**: Tabbed navigation (Groups, Deck, Scoreboard, Rules, # (2/9/16 Game)), responsive design, and intuitive UI components.
- **Data Flow**: Handles group creation, game start, card actions, and state synchronization via React Query.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React router
- **zod**: Runtime type validation

### UI
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library