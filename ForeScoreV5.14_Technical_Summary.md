# ForeScore V5.14 - Technical Summary & Formulas

## Calculation Algorithms (Verified Working)

### 1. Card Game - Proportional Share Algorithm
```typescript
// Input: Player card debts (e.g., Ken: $11, Daniel: $2, Brandon: $4, Cody: $2)
function cardsGame(debts: Record<string, number>): Record<string, number> {
  const totalPot = sum(debts);           // Total money in pot: $19
  const maxDebt = max(debts);            // Highest debt: $11
  
  // Calculate advantages (how much less debt each player has vs. worst)
  const advantages = players.map(p => maxDebt - debts[p]);
  const totalAdvantage = sum(advantages);
  
  // Distribute pot proportionally based on advantage
  for each player:
    share = (advantage / totalAdvantage) * totalPot
    netPayout = share - debt
}
```

### 2. Points Game - Pairwise Comparison
```typescript
// Input: Player point totals, value per point ($1)
function pointsGame(points: Record<string, number>, valuePerPoint = 1): Record<string, number> {
  const net = {};
  
  // Compare every pair of players
  for each pair (A, B):
    difference = points[A] - points[B]
    if difference > 0:
      net[A] += difference * valuePerPoint
      net[B] -= difference * valuePerPoint
}
```

### 3. FBT Game - Fixed Pot Winner-Takes-All
```typescript
// Input: Front/Back/Total scores, pot value ($10 per segment)
function fbtGame(front, back, total, potValue = 10): Record<string, number> {
  const net = {};
  
  for each segment [front, back, total]:
    winners = players with max score in segment
    losers = all other players
    
    winShare = potValue / winners.length
    loseShare = potValue / losers.length
    
    winners.forEach(w => net[w] += winShare)
    losers.forEach(l => net[l] -= loseShare)
}
```

### 4. Combined Games & Settlement
```typescript
// Combine multiple game results
function combineGames(...nets): Record<string, number> {
  for each player:
    total[player] = sum of all game nets for player
    round to 2 decimal places
}

// Generate optimized settlement transactions
function settleWhoOwesWho(net): Transaction[] {
  payers = players with negative net (owe money)
  receivers = players with positive net (receive money)
  
  // Greedy algorithm: largest payer to largest receiver
  while payers and receivers exist:
    match largest amounts and create transaction
    
  // Penny reconciliation for rounding differences
  adjust final transaction to ensure zero-sum
}
```

## API Endpoint Structure

### Primary Calculation Endpoint
```
POST /api/calculate-combined-games
{
  "groupId": string,
  "gameStateId": string | null,
  "pointsGameId": string | null, 
  "selectedGames": ["cards" | "points" | "fbt"],
  "pointValue": string,
  "fbtValue": string
}

Response:
{
  "payouts": Record<string, number>,
  "transactions": Transaction[],
  "selectedGames": string[],
  "success": boolean
}
```

## Data Flow Architecture

```
User Input → Frontend Validation → API Request → Server Validation
     ↓
Server Calculations (Cards/Points/FBT) → Combine → Settlement
     ↓
Zero-Sum Verification → Penny Reconciliation → JSON Response
     ↓
Frontend Display → Real-time Updates → User Confirmation
```

## Security Features

1. **Server-Side Calculations**: All algorithms run on server, preventing client tampering
2. **User Data Isolation**: Each user sees only their own groups/games  
3. **Session Authentication**: Secure cookie-based sessions with PostgreSQL storage
4. **Input Validation**: Zod schema validation on all API endpoints
5. **Zero-Sum Verification**: Mathematical validation ensures balanced transactions

## Database Relationships

```
Users (1) → (Many) Groups → (Many) Players
Groups (1) → (Many) GameStates → (Many) CardAssignments  
Groups (1) → (Many) PointsGames → (Many) HoleScores
GameStates (1) → (1) PointsGame (optional isolation)
```

## Performance Optimizations

- React Query caching with smart invalidation
- PostgreSQL connection pooling
- Efficient zero-sum validation algorithms
- Minimal API calls through canonical endpoint
- Real-time updates via WebSocket (production-ready)

## Deployment Readiness

✅ **Security**: Enterprise-grade authentication and validation  
✅ **Scalability**: Database connection pooling and efficient queries  
✅ **Reliability**: Comprehensive error handling and graceful degradation  
✅ **Maintainability**: Clean code architecture with single calculation pathway  
✅ **Testing**: Verified calculations with real-world scenarios  

The application is production-ready for immediate deployment.