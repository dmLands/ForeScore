# ForeScore - GIR Game with User-Configurable Penalty/Bonus Holes

## Overview
ForeScore is a secure, full-stack Progressive Web App designed as a companion for golf penalty games like "Animal." It provides enterprise-grade local authentication, server-side security validation, and comprehensive game management. The application supports group management, card game mechanics using a Proportional Share Algorithm, isolated 2/9/16 points games, and multiple payout calculation views. A key feature is the GIR (Greens in Regulation) game with user-configurable penalty and bonus holes. All game calculations are performed server-side to prevent tampering, ensuring secure user authentication, session management, and subscription access control. The project aims to be a robust, reliable, and secure platform for managing golf penalty games, aspiring to be the leading digital tool in this niche.

## Recent Changes
### V9.5 (COMPLETED) - November 2025
- **Scorecard Variant Separation & Data Display Fix**:
  - **Separate Points/Nassau Buttons**: Split combined game buttons into distinct variant buttons (e.g., "2/9/16 Points $1" and "2/9/16 Nassau $10" as separate toggleable buttons)
  - **Composite Variant Keys**: Implemented `game:mode` key format (e.g., '2916:points', 'gir:nassau', 'bbb:points') for precise variant selection
  - **Fixed GIR/2/9/16 Data Display**: Resolved issue where GIR and 2/9/16 data wasn't appearing in scorecard due to selectedGames initialization conflict
  - **Helper Functions**: Added `mapGameMetadataToVariants()` to parse backend metadata into selectable variants and `hasAnyVariant()` to check base game selection
  - **Auto-Select All Variants**: Scorecard modal now auto-selects all available game variants when opened (empty initialization triggers useEffect)
  - **Robust Value Parsing**: Defensive splitting of "$/$ /" format with trimming and fallback defaults to handle inconsistent spacing
  - **Custom Card Name Fix**: Card badges in payouts now display user-input names (e.g., "🔥 Hot Card $15") instead of generic "Custom" text

### V9.4 (COMPLETED) - November 2025
- **Admin Scorecard Enhancements**:
  - **Button-Based Game Selection**: Replaced checkboxes with styled Button components showing active/outline variants, added descriptive helper text
  - **Custom Card Name Display**: Updated card badges to show user-input names for custom cards instead of generic "Custom" label
  - **Fixed Cards Column Layout**: Proper sticky positioning with explicit column widths (Player: 140px, Cards: 160px at left-[140px])
  - **Auto-Select Available Games**: Added useEffect to automatically select all available games when scorecard loads, fixing empty data display issue
  - **Points/Nassau Mode Labels**: Backend now provides gameMetadata with mode information (Points/Nassau/Both) and dollar values, displayed in button subtitles
  - **Live Data Updates**: Scorecard cache properly invalidates when hole scores are updated

### V9.3 (COMPLETED) - November 2025
- **Subscription Status Fix & Sync Infrastructure**:
  - **Fixed Legacy User Issue**: Resolved mikejover@hotmail.com showing "Trial" instead of "Active" despite active Stripe subscription
  - **Admin Sync Endpoint**: Added `/api/admin/sync-user-subscription` for manual subscription sync by email (admin-only)
  - **Enhanced Webhook Logging**: Implemented detailed logging for all Stripe webhook events (setup_intent, invoice payments, subscription updates/deletions)
  - **Sync Verification**: Database now correctly shows status='active' for paid subscriptions, synced from Stripe canonical source
  - **Root Cause**: Webhook wasn't firing/processing when trial converted to active subscription (Oct 31 → Nov 7)

### V9.2 (COMPLETED) - November 2025
- **UI Standardization - Consistent Game Structure Across All Three Games**:
  - **Unified Section Flow**: Standardized all three game tabs (2/9/16, BBB, GIR) to follow identical structure: Payouts → Scores → Who Owes Who
  - **Dynamic Titles**: Implemented mode-based card titles across all games responding to payout mode selection (e.g., "GIR Points Payouts" vs "GIR Nassau Payouts", "BBB Nassau Payouts" vs "BBB Points Payouts")
  - **2/9/16 Tab Updates**: Added new Scores subsection displaying total points per player (Points mode) or Front 9 | Back 9 | Total stroke breakdown (Nassau mode)
  - **BBB Tab Updates**: Added new Who Owes Who subsection after Scores displaying optimized transactions calculated from payout amounts
  - **GIR Tab Updates**: Reordered sections to match standard flow, added Payout Amounts subsection showing dollar amounts per player before Scores section
  - **Robust Guards**: Added comprehensive null-safety checks (e.g., `payoutData && payoutData.payouts`, `Array.isArray(payoutData.whoOwesWho)`) to prevent runtime errors when server data is missing or undefined
  - **Consistent User Experience**: All three game types now present information in the same order with identical visual hierarchy and section structure

## User Preferences
I want iterative development. Ask before making major changes. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The application features a mobile-first responsive design with tabbed navigation and a consistent gray styling, complemented by an emerald green theme for key interactive elements. It leverages shadcn/ui (Radix UI primitives) for accessible and professional-looking components. Navigation is tab-based (Groups, Deck, Scoreboard, Rules, 2/9/16 Game), and the user flow includes a clean landing page, a restructured hamburger menu with Profile and About sections, and a comprehensive 7-step interactive tutorial. UI elements are standardized across different game types for consistent user experience.

### Technical Implementations
A complete local email/password authentication system is implemented with bcrypt hashing, secure session management, and a full password recovery workflow via SendGrid. Server-side validation is critical for all game calculations (Proportional Share Algorithm, 2/9/16 points, GIR) and card assignments to prevent client-side tampering. User data is isolated, and API endpoints are session-protected. Game logic includes an Excess Split Algorithm for payouts, a 2/9/16 Points Game with dual payout modes (Points/FBT), and combined settlement for optimized transactions. The GIR game supports user-defined penalty and bonus holes. The application manages group creation, game start, card actions, and state synchronization, with a canonical calculation pipeline ensuring data integrity.

### Feature Specifications
The system allows creation and management of player groups (up to 4 players) with unique colors and custom cards. The 2/9/16 Points Game includes hole-by-hole entry, automatic point calculation, live leaderboards, and payout calculation in "Points" and "FBT" modes. Users can define custom penalty cards. The GIR game offers flexible scoring with user-configurable penalty and bonus holes, persisting configurations per game. Payout visualization is enhanced with detailed tabs for Card Game, Combined settlements, and dedicated Points/FBT tiles. New users receive an automatic 7-day free trial.

### System Design Choices
The frontend is built with React 18, TypeScript, Vite, Wouter for routing, TanStack Query for state management, and React Hook Form with Zod for form handling. The backend uses Express.js with TypeScript and Node.js with ESM modules. Data is stored in PostgreSQL with Drizzle ORM, utilizing Neon Database. Authentication integrates with Replit Auth, supplemented by a local email/password system, using PostgreSQL for session storage. The API is RESTful with JSON responses, robust authentication, and all critical calculations handled server-side. API endpoints are consolidated in `newRoutes.ts`.

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