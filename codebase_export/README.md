# ForeScoreV5.13 (ForeScore10.1) - Complete Codebase Export

## Current Status
- **Version**: ForeScoreV5.13 (ForeScore10.1)  
- **Authentication**: ✅ Working (local email/password)
- **Card Game**: ✅ Working (Proportional Share Algorithm)
- **2/9/16 Game**: ✅ Working (complex scoring logic)
- **UI Issue**: ❌ "🎯 Who Owes Who - 2/9/16 Games" payouts tile broken
- **Combined Calculations**: ❌ Not matching expected values

## Critical Bug
**Expected**: Ken: +$36.84, Daniel: -$21.67  
**Actual**: Ken: +$21.00, Daniel: -$5.83  
(Brandon: -$9.35, Cody: -$5.83 are correct)

## Test Case
"Bat Crew > Legacy" game with card debts:
- Ken: 11
- Daniel: 2  
- Brandon: 4
- Cody: 2

## File Structure
```
├── home.tsx              # Main UI (BROKEN - duplicate tiles)
├── newRoutes.ts          # API routes
├── secureGameLogic.ts    # Server calculations
├── schema.ts             # Database schema
├── storage.ts            # Database operations  
└── package.json          # Dependencies
```

## Required Tile Order (Currently Broken)
1. Who Owes Who
2. Card Game  
3. 2/9/16 Games
4. Card Game Payouts
5. Points Only Payouts
6. FBT Only Payouts

## Key Issues to Fix
1. Remove duplicate tiles in home.tsx
2. Fix "🎯 Who Owes Who - 2/9/16 Games" display
3. Debug combined calculations discrepancy
4. Clean up orphaned UI code