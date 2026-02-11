# ForeScore - GIR Game with User-Configurable Penalty/Bonus Holes

## Overview
ForeScore is a secure, full-stack Progressive Web App designed as a companion for golf penalty games like "Animal." It provides enterprise-grade local authentication, server-side security validation, and comprehensive game management. The application supports group management, card game mechanics using a Proportional Share Algorithm, isolated 2/9/16 points games, and multiple payout calculation views. A key feature is the GIR (Greens in Regulation) game with user-configurable penalty and bonus holes. All game calculations are performed server-side to prevent tampering, ensuring secure user authentication, session management, and subscription access control. The project aims to be a robust, reliable, and secure platform for managing golf penalty games, aspiring to be the leading digital tool in this niche.

## User Preferences
I want iterative development. Ask before making major changes. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The application features a mobile-first responsive design with tabbed navigation and a consistent gray styling, complemented by an emerald green theme for key interactive elements. It leverages shadcn/ui (Radix UI primitives) for accessible and professional-looking components. Navigation is tab-based (Groups, Deck, Scoreboard, Rules, 2/9/16 Game), and the user flow includes a clean landing page, a restructured hamburger menu with Profile and About sections, and a comprehensive 7-step interactive tutorial. UI elements are standardized across different game types for consistent user experience, and the design is responsive across various devices, including iPads.

### Technical Implementations
A complete local email/password authentication system is implemented with bcrypt hashing, secure session management, and a full password recovery workflow via SendGrid. Server-side validation is critical for all game calculations (Proportional Share Algorithm, 2/9/16 points, GIR) and card assignments to prevent client-side tampering. User data is isolated, and API endpoints are session-protected. Game logic includes an Excess Split Algorithm for payouts, a 2/9/16 Points Game with dual payout modes (Points/FBT), and combined settlement for optimized transactions. The GIR game supports user-defined penalty and bonus holes. The application manages group creation, game start, card actions, and state synchronization, with a canonical calculation pipeline ensuring data integrity. It includes robust error handling with a global `ErrorBoundary` and defensive programming practices to prevent common runtime issues. Specific attention has been paid to iOS App Store compliance, leading to conditional UI elements and guarded payment flows for native iOS users. Quick email-only registration is available for QR users, with account completion required before subscription.

### Feature Specifications
The system allows creation and management of player groups (up to 4 players) with unique colors and custom cards. The 2/9/16 Points Game includes hole-by-hole entry, automatic point calculation, live leaderboards, and payout calculation in "Points" and "FBT" modes. Users can define custom penalty cards. The GIR game offers flexible scoring with user-configurable penalty and bonus holes, persisting configurations per game. Payout visualization is enhanced with detailed tabs for Card Game, Combined settlements, and dedicated Points/FBT tiles. New users receive an automatic 7-day free trial. The Scorecard UX has been improved with button-based game selection, custom card name displays, and a standardized game structure across all three main game types (2/9/16, BBB, GIR), ensuring consistent section flows (Payouts → Scores → Who Owes Who).

### Apple In-App Purchase (IAP) Integration
Native iOS subscriptions via StoreKit 2 with server-side validation using `@apple/app-store-server-library`. Products: forescore.monthly ($1.99/mo) and forescore.annual ($17.99/yr) with 7-day free trials. Bundle ID: xyz.forescore.app. S2S notification endpoint: /api/apple/notifications. JWS signature verification uses Apple's SignedDataVerifier with root CA certificates fetched from Apple; production mode rejects unverified payloads (dev-only fallback for testing). Access priority chain: manual trial → auto trial → Apple IAP → Stripe → legacy. Apple subscription status is prefixed with `apple_` in the subscriptionStatus field. Key files: server/appleIapService.ts, client/src/hooks/useAppleIAP.ts, client/src/components/IOSSubscriptionPrompt.tsx, ios/App/App/ForeScoreIAPPlugin.swift. Required secrets: APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PRIVATE_KEY. Optional: APPLE_IAP_APP_ID (numeric App Store ID for full verification).

### System Design Choices
The frontend is built with React 18, TypeScript, Vite, Wouter for routing, TanStack Query for state management, and React Hook Form with Zod for form handling. The backend uses Express.js with TypeScript and Node.js with ESM modules. Data is stored in PostgreSQL with Drizzle ORM, utilizing Neon Database. Authentication integrates with Replit Auth, supplemented by a local email/password system, using PostgreSQL for session storage. The API is RESTful with JSON responses, robust authentication, and all critical calculations handled server-side. API endpoints are consolidated in `newRoutes.ts`. A service worker is implemented for caching, with a critical fix ensuring proper update detection and deployment.

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