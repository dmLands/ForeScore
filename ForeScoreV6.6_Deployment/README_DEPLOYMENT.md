# ForeScore V6.6 - Deployment Package

## Version Information
**Version:** V6.6  
**Date:** August 28, 2025  
**Status:** Production Ready

## Changes in V6.6
### Bug Fixes
- **Golf Score Validation**: Fixed golf score validation to properly reject 0 as an invalid score (since you cannot score 0 in golf)
  - 0 scores now trigger "Invalid Scores" error message
  - Only positive integers (1, 2, 3, etc.) are accepted as valid golf scores
  - Maintains data integrity for 2/9/16 point calculations

## Deployment Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Environment variables configured

### Environment Variables Required
```
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
```

### Installation Steps
1. Extract the deployment package
2. Install dependencies: `npm install`
3. Set up environment variables
4. Initialize database: `npm run db:push`
5. Start the application: `npm run dev`

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express backend API
├── shared/          # Shared TypeScript schemas
├── package.json     # Dependencies and scripts
└── README_DEPLOYMENT.md
```

### Key Features
- **Enterprise-Grade Security**: Local authentication with bcrypt password hashing
- **Card Game Management**: Full penalty card game with Proportional Share Algorithm
- **2/9/16 Points Game**: Complete scoring system with Points/FBT payout modes
- **Real-time Updates**: WebSocket support for live game synchronization
- **Combined Settlements**: Optimized transaction calculations
- **Mobile-First Design**: Responsive UI with tabbed navigation

### Production Deployment
The application is ready for deployment on Replit or any Node.js hosting platform. All calculations are server-side validated to prevent tampering.

### Technical Support
Refer to the main replit.md file for detailed technical architecture and user preferences.