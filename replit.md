# ForeScore V9.1 - GIR Game with User-Configurable Penalty/Bonus Holes

## Overview
ForeScore V9.1 is a secure, full-stack Progressive Web App designed as a companion for the golf penalty game "Animal." It provides enterprise-grade local authentication with complete password recovery functionality, server-side security validation, enhanced payout visualization, frictionless trial registration with automatic 7-day trials, and now includes a comprehensive GIR (Greens in Regulation) game with user-configurable penalty and bonus holes. The application supports complete group management, card game mechanics utilizing a Proportional Share Algorithm, isolated 2/9/16 points games per session, multiple payout calculation views, and full GIR game tracking. All game calculations are performed server-side to prevent tampering, ensuring secure user authentication, session management, and subscription access control. The project's vision is to offer a robust, reliable, and secure platform for managing golf penalty games, with ambitions to become the leading digital tool in this niche.

## Recent Changes
### V9.1 (COMPLETED) - November 2025
- **GIR Game Enhancement - User-Configurable Penalty/Bonus Holes**:
  - **Database Schema**: Added `girHoleConfig` JSON column to pointsGames table storing user-defined penalty and bonus hole arrays
  - **Configuration UI**: Implemented intuitive hole configuration mode with "Penalty / Bonus" button that toggles configuration/scoring modes
  - **Tri-State Hole System**: Click holes to cycle neutral (gray) → penalty (red) → bonus (blue) → neutral with immediate visual feedback
  - **Server-Side Integration**: Updated all GIR calculation functions to use user-configured holes instead of hardcoded presets
  - **API Endpoint**: Created PUT `/api/gir-games/:gameId/hole-config` with validation ensuring mutual exclusivity and proper hole ranges
  - **Feature Flag Removal**: GIR game now available to all users (removed hasGirGameAccess checks from backend and frontend)
  - **Scoring Flexibility**: Users can define any combination of penalty/bonus holes or none at all, defaulting to neutral scoring
  - **Persistent Configuration**: Hole configurations save per game and persist across sessions for consistent gameplay

### V9.0 (COMPLETED) - October 2025
- **Frictionless Trial Registration**:
  - **Automatic Trial Grant**: New users automatically receive a 7-day free trial on registration without requiring payment information upfront
  - **Welcome Page**: Created dedicated welcome-trial page with three options: "Start Trial" (primary), "Monthly Plan", and "Annual Plan" (secondary)
  - **Trial Countdown Banner**: Implemented countdown banner component that appears 3 days before trial expiration, showing remaining time and upgrade option
  - **Seamless Flow**: Register → auto-grant trial → welcome page → full app access without payment friction
  - **Manual Trial System**: Leverages existing `manualTrialEndsAt` infrastructure with `grantedBy: null` for auto-granted trials
  - **Session Integration**: Trial users immediately get `manual_trial` subscription status with full app access

### V7.0 (COMPLETED) - September 2025
- **Complete Stripe Subscription Integration**:
  - **Invisible Trial Strategy**: Implemented 7-day free trial with upfront payment collection but no expiration warnings or countdown timers to users
  - **Binary Access Model**: Users either have full access (during trial or paid) or are completely logged out (expired) - no degraded functionality
  - **Proper Payment Flow**: Payment method collection BEFORE subscription creation, eliminating address validation errors
  - **Enhanced Subscription Management**: Clean UI showing trial status, upgrade options, and subscription cancellation with proper "ForeScore" branding (removed all "Pro" references)
  - **Tax Calculation**: Automatic tax collection with billing address fields for proper location-based tax calculation
  - **Live Stripe Integration**: Monthly ($1.99) and Annual ($16.99) pricing with proper invoice generation and 7-day trial display
  - **Production-Ready Security**: Webhook integration, proper subscription middleware, and server-side subscription status validation

### V6.8 (COMPLETED) - September 2025
- **Complete Password Recovery System**:
  - **End-to-End Workflow**: Implemented full password reset flow from forgot password request to successful login with new password
  - **SendGrid Email Integration**: Professional HTML email templates with red "Reset Password" button, white text, and inline styling for cross-client compatibility
  - **Security-First Design**: 30-minute token expiration, single-use tokens, secure 32-byte random token generation, and account enumeration prevention
  - **Enhanced User Experience**: Clean "Forgot Password" link on login page, clear success/error messaging, proper authentication state management
  - **Professional Branding**: Branded emails from support@forescore.xyz with ForeScore styling and comprehensive security notices
  - **Robust Error Handling**: Fixed authentication loops, routing conflicts, and redirect issues for seamless user experience
  - **Production-Ready Foundation**: Established secure token-based password reset system ready for security hardening

### V6.7 - September 2025
- **Hamburger Menu Restructure**:
  - **Username Display**: Maintained username only in submenu header for clean presentation
  - **Profile Section**: Added new Profile section displaying user information including name and email with organized layout
  - **About Section**: Created new About section with two subsections - "About Forescore" and "Terms of Service" for better information organization
  - **Visual Improvements**: Enhanced menu structure with proper icons, spacing, and section separators for improved user experience

### V6.6 - September 2025
- **Flicker Fix Implementation**:
  - **Extended isRestoring Logic**: Implemented comprehensive payout data readiness detection for Payouts tab
  - **Conditional Tile Rendering**: Fixed all rehydration flicker issues by waiting for payout-critical data before marking restoration complete
  - **Data Dependencies**: Enhanced restoration logic to check payoutData, selectedPointsPayouts, selectedFbtPayouts, combinedGamesResult, and pointsFbtCombinedResult
  - **User Experience**: Eliminated visual flickering and premature tile re-ordering during app initialization

### V6.4 - January 2025
- **UI/UX Structural Improvements**:
  - **Games Tab Cleanup**: Removed non-functional "Join Game" button and repositioned "Create Group" button under Recent Groups header for cleaner layout
  - **Game Selection Interface**: Removed "Active" pills from game selection since games don't have completion status tracking
  - **Game History Management**: Implemented 5-game display limit for group history instead of broken delete functionality, maintaining clean interface
  - **Consistent Design Language**: Normalized tutorial styling from colorful theme to consistent gray styling matching overall app design
  - **Rules Tab Enhancement**: Restructured content with numbered green circle headers for consistent formatting throughout

- **Backend Infrastructure**:
  - **Database Cleanup System**: Added manual cleanup endpoint (`/api/admin/cleanup-old-games`) with smart retention logic:
    - For users with **6+ groups**: Keeps 5 most recent groups forever, deletes excess groups only if 61+ days old
    - For users with **5 or fewer groups**: Never deletes any data, regardless of age
    - No automatic cleanup on server startup - cleanup is manual and intentional only
  - **Clean Code Architecture**: Chose maintainable solutions over quick fixes, prioritizing long-term code health and scalability
  - **Content Hierarchy**: Consistently prioritized 2/9/16 game over card game throughout Rules and tutorial sections

### V6.3 - January 2025
- **Login Page Cosmetic Updates**:
  - Changed branding pill from "Golf Game Companion" to "Golf Payout Calculator"
  - Updated Card Game description: "Don't be an animal! Classic penalty cards game where players collect cards for golf mishaps, and payouts are automatically calculated to fairly reward those who stay out of trouble."
  - Updated 2/9/16 Game description (revised): "The classic points game where players earn 2, 9, or 16 points (match play, threesomes, or foursomes) points per hole depending on performance. Includes three payout modes (Points or Front-Back-Total [FBT], or both)."
  - Reordered tiles: 2/9/16 Game moved to top position
  - Added new "Live Leaderboards" tile with 💰 emoji: "Combine games and instantly calculate payouts with the fewest number of transactions. Money only changes hands once. Real-time leaderboards, and seamless hole-by-hole score tracking."
  - Final tile order: 2/9/16 Game, Card Game, Live Leaderboards (vertical stack layout)
- **Key Structural Improvements**:
  - **Auto-Create 2/9/16 Games**: Modified game creation endpoint to automatically create both Card Game and 2/9/16 points game simultaneously during initial setup, eliminating the manual step
  - **Navigation Restructure**: Changed default landing page from Card Game to 2/9/16 Game after game creation
  - **Tab Reordering**: Swapped positions of "Deck" and "2/9/16" tabs, renamed "Deck" to "Cards"
  - **Final tab order**: Games, 2/9/16, Cards, Payouts, Rules

## User Preferences
I want iterative development. Ask before making major changes. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
- **Design Philosophy**: Mobile-first responsive design with tabbed navigation.
- **Color Scheme**: Consistent gray styling throughout the application, with specific elements like the "Calculate Payouts" button using an emerald green theme.
- **UI Components**: Utilizes shadcn/ui (Radix UI primitives) for accessible and professional-looking components.
- **Navigation**: Tabbed navigation (Groups, Deck, Scoreboard, Rules, 2/9/16 Game).
- **User Flow**: Clean landing page, restructured hamburger menu with Profile and About sections for enhanced user information access.
- **Tutorial**: Includes a comprehensive 7-step interactive tutorial.

### Technical Implementations
- **Authentication**: Complete local email/password authentication system with bcrypt password hashing, secure session management, and full password recovery workflow via SendGrid email integration. Features secure token generation, 30-minute expiration, and professional email templates.
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

### Email & Communication
- **@sendgrid/mail**: Professional email delivery service for password reset functionality.