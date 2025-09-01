# ForeScoreV5.13 (ForeScore10.1) - Complete Codebase Export

## Project Structure
```
├── client/src/
│   ├── pages/
│   │   ├── home.tsx          # Main application UI with payouts
│   │   ├── login.tsx         # Authentication pages
│   │   └── register.tsx
│   ├── components/ui/        # shadcn/ui components
│   ├── lib/
│   │   └── queryClient.ts    # TanStack Query setup
│   └── App.tsx              # Main app router
├── server/
│   ├── index.ts             # Express server entry
│   ├── newRoutes.ts         # All API routes
│   ├── secureGameLogic.ts   # Server-side calculations  
│   ├── storage.ts           # Database operations
│   └── auth.ts              # Authentication middleware
├── shared/
│   └── schema.ts            # Drizzle database schema
└── package.json             # Dependencies
```

## Current Issues
- "🎯 Who Owes Who - 2/9/16 Games" payouts tile is broken in UI
- Combined game calculations need debugging
- UI structure has duplicate tiles causing display issues

## Key Files Status
- ✅ Authentication system working
- ✅ Card game calculations working
- ✅ 2/9/16 game calculations working
- ❌ Payouts tab UI structure broken
- ❌ Combined calculations not matching expected values

## Critical Bug
Expected Ken: +$36.84, Daniel: -$21.67 vs Actual Ken: +$21.00, Daniel: -$5.83
(Brandon: -$9.35, Cody: -$5.83 are correct)

## Required Tile Order
1. Who Owes Who
2. Card Game  
3. 2/9/16 Games
4. Card Game Payouts
5. Points Only Payouts
6. FBT Only Payouts

## Test Case
"Bat Crew > Legacy" game with card debts Ken:11, Daniel:2, Brandon:4, Cody:2