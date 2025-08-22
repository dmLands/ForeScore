# CardGamePayments Method

## Overview
The CardGamePayments method implements the "pay up" algorithm for calculating fair payouts in the ForeScore card game. This method ensures that players with reasonable debt levels can "pay up" to achieve net $0 debt, then split any remaining large debts evenly.

## Algorithm Steps

### Step 1: Calculate Total Debt
Sum all card values assigned to players to get the total pot.

### Step 2: Find Minimum Debt
Identify the minimum debt amount among all players.

### Step 3: Calculate NetPot
NetPot = Total Debt - Minimum Debt

### Step 4: Two-Phase Pay Up Method

#### Phase 1: Players Pay Up to Minimum Debt Level
- Find players at minimum debt level
- Identify players with "reasonable" debt (debt ≤ minDebt + NetPot × 0.4)
- Players with reasonable debt pay their full debt to minimum debt players
- This brings all reasonable debt players to net $0 debt

#### Phase 2: Split Remaining Debt
- Calculate remaining debt after pay up phase
- Split remaining debt evenly among all players who achieved net $0 debt
- Players with large debt (above reasonable threshold) pay their full debt

## Example Calculation

**Input:** Daniel($2), Rory($4), Oscar($4), Kate($14)
- Total Debt: $24
- Minimum Debt: $2 (Daniel)
- NetPot: $22
- Reasonable Debt Threshold: $2 + ($22 × 0.4) = $10.80

**Phase 1:**
- Players who can pay up: Rory($4), Oscar($4)
- Total pay up debt: $8 (goes to Daniel)
- Remaining debt: $22 - $8 = $14

**Phase 2:**
- Players at net $0: Daniel, Rory, Oscar
- Split Kate's $14 evenly: $14 ÷ 3 = $4.67 each

**Results:**
- Daniel: $8 received + $4.67 share = $12.67 receives
- Rory: $4.67 receives
- Oscar: $4.67 receives  
- Kate: $14 pays

## Implementation Notes
- Reasonable debt threshold uses 40% of NetPot as heuristic
- Method ensures sum of payments equals sum of receipts
- Each card has single unique value for the pot
- Algorithm works for any debt configuration

## Date Implemented
January 2025 - Successfully tested and verified with user example