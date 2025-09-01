// Server-side secure game logic to prevent client tampering
import { Card, CardAssignment, Player, CardValues, CustomCard } from "@shared/schema";

export interface ProportionalShareResult {
  totalPot: number;
  maxDebt: number;
  payouts: Array<{
    playerId: string;
    playerName: string;
    debt: number;
    advantage: number;
    share: number;
    netPayout: number;
  }>;
}

/**
 * Server-side Proportional Share Algorithm calculation
 * Logic: Each player's advantage over the worst player determines their proportional share of the total pot
 * Formula: share = (advantage / totalAdvantage) * totalPot; netPayout = share - debt
 * This prevents client-side tampering with payout calculations
 */
export function calculateProportionalShare(
  cardHistory: CardAssignment[],
  players: Player[]
): ProportionalShareResult {
  // Calculate total debt for each player
  const playerDebts: Record<string, number> = {};
  
  // Initialize all players with 0 debt
  players.forEach(player => {
    playerDebts[player.id] = 0;
  });
  
  // Sum up debts from CURRENT card assignments only (not full history)
  // For each card, only count the latest assignment to avoid double-counting reassignments
  const currentAssignments: Record<string, CardAssignment> = {};
  
  // Build map of current assignments (latest assignment for each cardId)
  cardHistory.forEach(assignment => {
    currentAssignments[assignment.cardId] = assignment;
  });
  
  // Sum up debts from current assignments only
  Object.values(currentAssignments).forEach(assignment => {
    if (playerDebts[assignment.playerId] !== undefined) {
      playerDebts[assignment.playerId] += assignment.cardValue || 0;
    }
  });
  
  // Step 1: Calculate total pot
  const totalPot = Object.values(playerDebts).reduce((sum, debt) => sum + debt, 0);
  
  // Step 2: Find maximum debt
  const maxDebt = Math.max(...Object.values(playerDebts));
  
  // Step 3: Calculate advantage over worst (max debt)
  const playerAdvantages: Record<string, number> = {};
  players.forEach(player => {
    const debt = playerDebts[player.id];
    playerAdvantages[player.id] = maxDebt - debt;
  });
  
  // Step 4: Calculate total advantage
  const totalAdvantage = Object.values(playerAdvantages).reduce((sum, advantage) => sum + advantage, 0);
  
  // Step 5 & 6: Calculate proportional shares and net payouts
  const payouts = players.map(player => {
    const debt = playerDebts[player.id];
    const advantage = playerAdvantages[player.id];
    
    // Proportional share of the pot based on advantage
    const share = totalAdvantage > 0 ? (advantage / totalAdvantage) * totalPot : 0;
    
    // Net payout = share - debt
    const netPayout = share - debt;
    
    return {
      playerId: player.id,
      playerName: player.name,
      debt,
      advantage,
      share,
      netPayout
    };
  });
  
  return {
    totalPot,
    maxDebt,
    payouts
  };
}

/**
 * Server-side validation of card assignments
 */
export function validateCardAssignment(
  cardId: string,
  playerId: string,
  deck: Card[],
  players: Player[]
): { valid: boolean; error?: string } {
  // Check if card exists in deck
  const cardExists = deck.some(card => card.id === cardId);
  if (!cardExists) {
    return { valid: false, error: 'Card not found in deck' };
  }
  
  // Check if player exists
  const playerExists = players.some(player => player.id === playerId);
  if (!playerExists) {
    return { valid: false, error: 'Player not found' };
  }
  
  return { valid: true };
}

/**
 * Server-side calculation of 2/9/16 points with proper tie handling
 * This is the correct complex scoring logic from the original working system
 */
export function calculate2916Points(
  holeScores: Record<string, number>
): Record<string, number> {
  const playerIds = Object.keys(holeScores);
  const numPlayers = playerIds.length;
  const points: Record<string, number> = {};
  
  // Group players by their stroke count
  const strokeGroups: Record<number, string[]> = {};
  playerIds.forEach(playerId => {
    const stroke = holeScores[playerId];
    if (!strokeGroups[stroke]) strokeGroups[stroke] = [];
    strokeGroups[stroke].push(playerId);
  });
  
  const sortedStrokes = Object.keys(strokeGroups).map(Number).sort((a, b) => a - b);
  
  if (numPlayers === 2) {
    // Two player rules
    if (sortedStrokes.length === 1) {
      // Both players tied
      playerIds.forEach(id => points[id] = 1);
    } else {
      // Different scores
      strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 2); // Lowest
      strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 0); // Highest
    }
  } else if (numPlayers === 3) {
    // Three player rules
    if (sortedStrokes.length === 1) {
      // All tied
      playerIds.forEach(id => points[id] = 3);
    } else if (sortedStrokes.length === 2) {
      // Two groups
      if (strokeGroups[sortedStrokes[0]].length === 2) {
        // Two tied for lowest, one highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 4);
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 1);
      } else {
        // One lowest, two tied for highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 5);
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 2);
      }
    } else {
      // All different
      strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 5); // Lowest
      strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 3); // Middle
      strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 1); // Highest
    }
  } else if (numPlayers === 4) {
    // Four player rules
    if (sortedStrokes.length === 1) {
      // All tied
      playerIds.forEach(id => points[id] = 4);
    } else if (sortedStrokes.length === 2) {
      // Two groups
      if (strokeGroups[sortedStrokes[0]].length === 2 && strokeGroups[sortedStrokes[1]].length === 2) {
        // Two tied for lowest, two tied for highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 5);
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 3);
      } else if (strokeGroups[sortedStrokes[0]].length === 3) {
        // Three tied for lowest, one highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 5);
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 1);
      } else {
        // One lowest, three tied for highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 7);
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 3);
      }
    } else if (sortedStrokes.length === 3) {
      // Three groups
      if (strokeGroups[sortedStrokes[1]].length === 2) {
        // One lowest, two tied for middle, one highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 6);
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 4);
        strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 2);
      } else {
        // One lowest, one middle, two tied for highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 7);
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 5);
        strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 3);
      }
    } else {
      // All different (4 groups)
      strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 7); // Lowest
      strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 5); // Second
      strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 3); // Third
      strokeGroups[sortedStrokes[3]].forEach(id => points[id] = 1); // Highest
    }
  }
  
  return points;
}

/**
 * Server-side "Who Owes Who" calculation
 */
export function calculateWhoOwesWho(payouts: ProportionalShareResult['payouts']): Array<{
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}> {
  // Create deep copies to avoid mutating the original payouts array
  const creditors = payouts.filter(p => p.netPayout > 0).map(p => ({ ...p })).sort((a, b) => b.netPayout - a.netPayout);
  const debtors = payouts.filter(p => p.netPayout < 0).map(p => ({ ...p })).sort((a, b) => a.netPayout - b.netPayout);
  
  const transactions: Array<{
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
  }> = [];
  
  let creditorIndex = 0;
  let debtorIndex = 0;
  
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    
    const amountToReceive = creditor.netPayout;
    const amountToPay = Math.abs(debtor.netPayout);
    const paymentAmount = Math.min(amountToReceive, amountToPay);
    
    if (paymentAmount > 0.01) { // Only include meaningful transactions
      transactions.push({
        from: debtor.playerId,
        fromName: debtor.playerName,
        to: creditor.playerId,
        toName: creditor.playerName,
        amount: Math.round(paymentAmount * 100) / 100
      });
    }
    
    // Update remaining amounts
    creditor.netPayout -= paymentAmount;
    debtor.netPayout += paymentAmount;
    
    // Move to next creditor/debtor if current one is settled
    if (Math.abs(creditor.netPayout) < 0.01) {
      creditorIndex++;
    }
    if (Math.abs(debtor.netPayout) < 0.01) {
      debtorIndex++;
    }
  }
  
  return transactions;
}

/**
 * Calculate Who Owes Who for 2/9/16 points game
 */
export function calculate2916WhoOwesWho(
  players: Array<{id: string, name: string}>,
  payouts: Record<string, number>
): Array<{
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}> {
  // Convert payouts to the format needed for Who Owes Who calculation
  const formattedPayouts = players.map(player => ({
    playerId: player.id,
    playerName: player.name,
    debt: 0, // Not used for 2/9/16
    advantage: 0, // Not used for 2/9/16
    share: 0, // Not used for 2/9/16
    netPayout: payouts[player.id] || 0
  }));

  return calculateWhoOwesWho(formattedPayouts);
}

/**
 * Calculate combined Cards + 2/9/16 Who Owes Who
 */
export function calculateCombinedWhoOwesWho(
  cardPayouts: ProportionalShareResult['payouts'],
  pointsPayouts: Array<{
    playerId: string;
    playerName: string;
    netPayout: number;
  }>
): Array<{
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}> {
  // Combine card and points payouts
  const combinedPayouts: Array<{
    playerId: string;
    playerName: string;
    debt: number;
    advantage: number;
    share: number;
    netPayout: number;
  }> = [];

  // Start with card payouts
  cardPayouts.forEach(cardPayout => {
    const pointsPayout = pointsPayouts.find(p => p.playerId === cardPayout.playerId);
    combinedPayouts.push({
      playerId: cardPayout.playerId,
      playerName: cardPayout.playerName,
      debt: cardPayout.debt,
      advantage: cardPayout.advantage,
      share: cardPayout.share,
      netPayout: cardPayout.netPayout + (pointsPayout?.netPayout || 0)
    });
  });

  // Add any points payouts not already included
  pointsPayouts.forEach(pointsPayout => {
    if (!combinedPayouts.find(p => p.playerId === pointsPayout.playerId)) {
      combinedPayouts.push({
        playerId: pointsPayout.playerId,
        playerName: pointsPayout.playerName,
        debt: 0,
        advantage: 0,
        share: 0,
        netPayout: pointsPayout.netPayout
      });
    }
  });

  return calculateWhoOwesWho(combinedPayouts);
}

/**
 * Combined games calculation using Python reference implementation
 */
export function calculateCardsGame(cardsDebt: Record<string, number>): Record<string, number> {
  const totalPot = Object.values(cardsDebt).reduce((sum, debt) => sum + debt, 0);
  const maxDebt = Math.max(...Object.values(cardsDebt));
  const advantages: Record<string, number> = {};
  
  // Calculate advantages
  Object.entries(cardsDebt).forEach(([playerId, debt]) => {
    advantages[playerId] = maxDebt - debt;
  });
  
  const totalAdvantage = Object.values(advantages).reduce((sum, adv) => sum + adv, 0);
  
  const result: Record<string, number> = {};
  Object.entries(cardsDebt).forEach(([playerId, debt]) => {
    const share = advantages[playerId] > 0 && totalAdvantage > 0 
      ? (advantages[playerId] / totalAdvantage) * totalPot 
      : 0;
    result[playerId] = Math.round((share - debt) * 100) / 100;
  });
  
  return result;
}

export function calculatePointsGame(pointsScores: Record<string, number>, valuePerPoint: number = 1): Record<string, number> {
  const players = Object.keys(pointsScores);
  const net: Record<string, number> = {};
  
  // Initialize all players
  players.forEach(player => {
    net[player] = 0;
  });
  
  // Pairwise comparison
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];
      const diff = pointsScores[p1] - pointsScores[p2];
      
      if (diff > 0) {
        net[p1] += diff * valuePerPoint;
        net[p2] -= diff * valuePerPoint;
      } else if (diff < 0) {
        net[p2] += (-diff) * valuePerPoint;
        net[p1] -= (-diff) * valuePerPoint;
      }
    }
  }
  
  const result: Record<string, number> = {};
  players.forEach(player => {
    result[player] = Math.round(net[player] * 100) / 100;
  });
  
  return result;
}

export function calculateFbtGame(
  frontPoints: Record<string, number>,
  backPoints: Record<string, number>, 
  totalPoints: Record<string, number>,
  potValue: number = 10
): Record<string, number> {
  const net: Record<string, number> = {};
  const allPlayers = Object.keys(frontPoints);
  
  // Initialize all players
  allPlayers.forEach(player => {
    net[player] = 0;
  });
  
  // Process each segment (front, back, total)
  [frontPoints, backPoints, totalPoints].forEach(segment => {
    const maxScore = Math.max(...Object.values(segment));
    const winners = Object.entries(segment)
      .filter(([_, score]) => score === maxScore)
      .map(([player, _]) => player);
    const losers = Object.keys(segment).filter(player => !winners.includes(player));
    
    // Skip if all tied
    if (winners.length === Object.keys(segment).length) {
      return;
    }
    
    const winShare = potValue / winners.length;
    const loseShare = potValue / losers.length;
    
    winners.forEach(winner => {
      net[winner] += winShare;
    });
    losers.forEach(loser => {
      net[loser] -= loseShare;
    });
  });
  
  const result: Record<string, number> = {};
  allPlayers.forEach(player => {
    result[player] = Math.round(net[player] * 100) / 100;
  });
  
  return result;
}

export function combineGames(...nets: Record<string, number>[]): Record<string, number> {
  if (nets.length === 0) return {};
  
  const players = Object.keys(nets[0]);
  const result: Record<string, number> = {};
  
  players.forEach(player => {
    const total = nets.reduce((sum, net) => sum + (net[player] || 0), 0);
    result[player] = Math.round(total * 100) / 100;
  });
  
  return result;
}

export function settleWhoOwesWho(net: Record<string, number>): Array<{ from: string, to: string, amount: number }> {
  const payers = Object.entries(net)
    .filter(([_, amount]) => amount < 0)
    .map(([player, amount]) => ({ player, amount: -amount }))
    .sort((a, b) => b.amount - a.amount);
  
  const receivers = Object.entries(net)
    .filter(([_, amount]) => amount > 0)
    .map(([player, amount]) => ({ player, amount }))
    .sort((a, b) => b.amount - a.amount);
  
  const transactions: Array<{ from: string, to: string, amount: number }> = [];
  let payerIndex = 0;
  let receiverIndex = 0;
  
  while (payerIndex < payers.length && receiverIndex < receivers.length) {
    const payer = payers[payerIndex];
    const receiver = receivers[receiverIndex];
    
    const payAmount = Math.min(payer.amount, receiver.amount);
    
    if (payAmount > 0.01) {
      transactions.push({
        from: payer.player,
        to: receiver.player,
        amount: Math.round(payAmount * 100) / 100
      });
    }
    
    payer.amount -= payAmount;
    receiver.amount -= payAmount;
    
    if (payer.amount < 0.01) payerIndex++;
    if (receiver.amount < 0.01) receiverIndex++;
  }
  
  return transactions;
}

/**
 * Generate secure share codes
 */
export function generateSecureShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}