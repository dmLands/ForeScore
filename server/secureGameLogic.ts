// ============================================================================
// Canonical, single-source math (NO duplicate implementations anywhere else).
// Rounds ONLY once in combineGames(); settlement has penny reconciliation.
// ============================================================================

import { CardAssignment, Player, Card } from "@shared/schema";

export interface CardGameResult {
  totalPot: number;
  payouts: Array<{
    playerId: string;
    playerName: string;
    debt: number;
    netPayout: number;
  }>;
}

/** Fair "Excess over Minimum" Method - Final algorithm */
function cardsGameFromDebts(
  debts: Record<string, number>
): Record<string, number> {
  const players = Object.keys(debts);
  if (players.length === 0) return {};

  // 1) Find the minimum debt b among players
  const minDebt = Math.min(...players.map(p => debts[p]));
  
  // 2) Each player's excess e_i = max(debt_i - b, 0)
  const excess: Record<string, number> = {};
  let totalExcess = 0;
  
  for (const p of players) {
    const e = Math.max(debts[p] - minDebt, 0);
    excess[p] = e;
    totalExcess += e;
  }

  // 3) Baseline players (debt == minDebt) split total excess evenly
  const baseline = players.filter(p => debts[p] === minDebt);
  const share = baseline.length > 0 ? totalExcess / baseline.length : 0;

  // 4) Baseline players receive E / (#baseline); non-baseline pay exactly their excess
  const net: Record<string, number> = {};
  for (const p of players) {
    net[p] = round2(debts[p] === minDebt ? share : -excess[p]);
  }

  // 5) Penny reconciliation: ensure exact zero-sum after rounding
  const sum = round2(Object.values(net).reduce((s, v) => s + v, 0));
  if (Math.abs(sum) >= 0.01 && baseline.length > 0) {
    const last = baseline[baseline.length - 1];
    net[last] = round2(net[last] - sum); // nudge last baseline recipient by residual cents
  }
  
  console.log('FAIR EXCESS ALGORITHM DEBUG:', {
    debts,
    minDebt,
    excess,
    totalExcess,
    baseline,
    share,
    net,
    sum,
    'zero-sum check': Object.values(net).reduce((s, v) => s + v, 0)
  });
  
  return net;
}

/** A) Cards Game (Fair Excess over Minimum) - Exact Implementation */
export function calculateCardsGame(
  cardsDebt: Record<string, number>
): Record<string, number> {
  return cardsGame(cardsDebt);
}

function cardsGame(debts: Record<string, number>): Record<string, number> {
  const result = cardsGameFromDebts(debts);
  // Round the final results
  for (const p of Object.keys(result)) {
    result[p] = round2(result[p]);
  }
  return result;
}

/** Cards details for UI (delegates to same math). */
export function calculateCardGameDetails(
  cardHistory: CardAssignment[],
  players: Player[],
  cardValues?: Record<string, number>
): CardGameResult {
  const latest: Record<string, CardAssignment> = {};
  for (const a of cardHistory) latest[a.cardId] = a;

  const debts: Record<string, number> = {};
  for (const p of players) debts[p.id] = 0;
  for (const a of Object.values(latest)) {
    if (debts[a.playerId] !== undefined) {
      // Use current card values if provided, otherwise fall back to stored value
      let currentCardValue: number;
      
      if (a.cardType === 'custom') {
        // For custom cards, use the card name as the key in cardValues
        // Try both original case and lowercase for compatibility
        const cardNameKey = a.cardName?.toLowerCase() || '';
        currentCardValue = cardValues?.[a.cardName] ?? cardValues?.[cardNameKey] ?? a.cardValue ?? 0;
      } else {
        // For default cards, use cardType as the key
        currentCardValue = cardValues?.[a.cardType] ?? a.cardValue ?? 0;
      }
      
      debts[a.playerId] += currentCardValue;
    }
  }

  const netsRaw = cardsGameFromDebts(debts);
  const totalPot = Object.values(debts).reduce((s, d) => s + d, 0);

  const payouts = players.map(p => {
    const debt = debts[p.id] ?? 0;
    const netPayout = netsRaw[p.id] ?? 0;
    return { playerId: p.id, playerName: p.name, debt, netPayout };
  });

  return { totalPot, payouts };
}

/** Points — RAW nets (pairwise). */
export /** B) Points Game (Pairwise Difference; $/point) - Exact Implementation */
function calculatePointsGame(
  pointsScores: Record<string, number>,
  valuePerPoint: number = 1
): Record<string, number> {
  return pointsGame(pointsScores, valuePerPoint);
}

function pointsGame(points: Record<string, number>, valuePerPoint = 1): Record<string, number> {
  const players = Object.keys(points);
  const net: Record<string, number> = Object.fromEntries(players.map(p => [p, 0]));

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j];
      const diff = points[a] - points[b];
      if (diff > 0) { 
        net[a] += diff * valuePerPoint; 
        net[b] -= diff * valuePerPoint; 
      } else if (diff < 0) { 
        net[b] += -diff * valuePerPoint; 
        net[a] -= -diff * valuePerPoint; 
      }
    }
  }
  for (const p of players) net[p] = round2(net[p]);
  return net;
}

/** C) Points Game (FBT: Front / Back / Total; fixed pot/segment) - Exact Implementation */
export function calculateFbtGame(
  frontPoints: Record<string, number>,
  backPoints: Record<string, number>,
  totalPoints: Record<string, number>,
  potValue: number = 10
): Record<string, number> {
  return fbtGame(frontPoints, backPoints, totalPoints, potValue);
}

function fbtGame(front: Record<string, number>, back: Record<string, number>, total: Record<string, number>, potValue = 10): Record<string, number> {
  const allPlayers = Array.from(new Set([...Object.keys(front), ...Object.keys(back), ...Object.keys(total)]));
  const net: Record<string, number> = {};
  for (const p of allPlayers) net[p] = 0;

  for (const segment of [front, back, total]) {
    const segPlayers = Object.keys(segment);
    if (segPlayers.length === 0) continue;
    
    // In 2/9/16 points system, HIGHEST points win (unlike stroke play where lowest wins)
    const maxPoints = Math.max(...segPlayers.map(p => segment[p]));
    const winners = segPlayers.filter(p => segment[p] === maxPoints);
    const losers = segPlayers.filter(p => !winners.includes(p));
    if (winners.length === segPlayers.length) continue; // all tied

    const winShare = potValue / winners.length;
    const loseShare = potValue / losers.length;
    for (const w of winners) net[w] += winShare;
    for (const l of losers) net[l] -= loseShare;
  }
  for (const p of allPlayers) net[p] = round2(net[p]);
  return net;
}

/** Build FBT nets from pointsGame.points (NOT strokes/holes). */
export function buildFbtNetsFromPointsGame(
  groupPlayers: Player[],
  pointsGame: { points?: Record<number, Record<string, number>> },
  potValue: number
): Record<string, number> {
  const front: Record<string, number> = {};
  const back: Record<string, number> = {};
  const total: Record<string, number> = {};
  groupPlayers.forEach(p => { front[p.id]=0; back[p.id]=0; total[p.id]=0; });

  Object.entries(pointsGame.points || {}).forEach(([holeStr, hp]) => {
    const hole = parseInt(holeStr,10);
    for (const pid of Object.keys(total)) {
      const pts = hp?.[pid] || 0;
      if (hole <= 9) front[pid] += pts; else back[pid] += pts;
      total[pid] += pts;
    }
  });

  return calculateFbtGame(front, back, total, potValue); // RAW
}

/** Combine nets by KEY (never by index) - Fixed Version */
export function combineGames(...nets: Record<string, number>[]): Record<string, number> {
  const combined: Record<string, number> = {};
  for (const net of nets) {
    for (const [p, v] of Object.entries(net)) {
      combined[p] = round2((combined[p] ?? 0) + v);
    }
  }
  
  // Debug logging to identify zero-sum issues
  const sum = round2(Object.values(combined).reduce((s, x) => s + x, 0));
  if (Math.abs(sum) >= 0.02) {
    console.error('Zero-sum validation failed:', {
      combined,
      sum,
      individualNets: nets.map((net, i) => ({
        index: i,
        net,
        sum: round2(Object.values(net).reduce((s, x) => s + x, 0))
      }))
    });
    
    // Apply penny reconciliation to fix minor rounding errors
    if (Math.abs(sum) < 0.05 && Object.keys(combined).length > 0) {
      // Find the player with the largest positive amount and adjust
      const sortedPlayers = Object.entries(combined).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      if (sortedPlayers.length > 0) {
        const [playerId, amount] = sortedPlayers[0];
        combined[playerId] = round2(amount - sum);
        console.log(`Applied penny reconciliation: adjusted ${playerId} by ${-sum}`);
      }
    } else {
      throw new Error(`Combined nets not zero-sum (got ${sum}). Upstream bug.`);
    }
  }
  return combined;
}

function round2(x: number): number { 
  return Math.round(x * 100) / 100; 
}

/** Who-owes-who from the combined nets - Fixed Version */
export function settleWhoOwesWho(net: Record<string, number>): Array<{ from: string; to: string; amount: number }> {
  const payers = Object.entries(net)
    .filter(([, amt]) => amt < 0)
    .map(([p, amt]) => [p, -amt] as [string, number])
    .sort((a, b) => b[1] - a[1]); // largest owes first

  const receivers = Object.entries(net)
    .filter(([, amt]) => amt > 0)
    .map(([p, amt]) => [p, amt] as [string, number])
    .sort((a, b) => b[1] - a[1]); // largest needs first

  const legs: Array<{ from: string; to: string; amount: number }> = [];
  let i = 0, j = 0;

  while (i < payers.length && j < receivers.length) {
    let [from, owe] = payers[i];
    let [to, need] = receivers[j];
    const pay = round2(Math.min(owe, need));
    legs.push({ from, to, amount: pay });
    owe = round2(owe - pay);
    need = round2(need - pay);
    if (owe <= 0.001) i++; else payers[i] = [from, owe];
    if (need <= 0.001) j++; else receivers[j] = [to, need];
  }

  // Penny reconciliation: ensure paid = total positive
  const totalRecv = round2(Object.values(net).filter(x => x > 0).reduce((s, x) => s + x, 0));
  const totalPaid = round2(legs.reduce((s, leg) => s + leg.amount, 0));
  const diff = round2(totalRecv - totalPaid);
  if (Math.abs(diff) >= 0.01 && legs.length > 0) {
    legs[legs.length - 1].amount = round2(legs[legs.length - 1].amount + diff);
  }
  return legs;
}

// Export aliases for canonical 3-step pipeline
export const combineTotals = combineGames;
export const generateSettlement = settleWhoOwesWho;

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
 * CORRECTED: Points must sum to exactly 16 per hole for 4 players
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
    // Two player rules - sum = 2
    if (sortedStrokes.length === 1) {
      // Both players tied
      playerIds.forEach(id => points[id] = 1);
    } else {
      // Different scores
      strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 2); // Lowest
      strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 0); // Highest
    }
  } else if (numPlayers === 3) {
    // Three player rules - sum = 9
    if (sortedStrokes.length === 1) {
      // All tied
      playerIds.forEach(id => points[id] = 3);
    } else if (sortedStrokes.length === 2) {
      // Two groups
      if (strokeGroups[sortedStrokes[0]].length === 2) {
        // Two tied for lowest, one highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 4); // 4 + 4 = 8
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 1); // 1, total = 9
      } else {
        // One lowest, two tied for highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 5); // 5
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 2); // 2 + 2 = 4, total = 9
      }
    } else {
      // All different
      strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 5); // Lowest
      strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 3); // Middle
      strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 1); // Highest, total = 9
    }
  } else if (numPlayers === 4) {
    // Four player rules - sum MUST = 16
    if (sortedStrokes.length === 1) {
      // All tied
      playerIds.forEach(id => points[id] = 4); // 4 + 4 + 4 + 4 = 16
    } else if (sortedStrokes.length === 2) {
      const firstGroupSize = strokeGroups[sortedStrokes[0]].length;
      if (firstGroupSize === 3) {
        // Three tied for lowest, one highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 5); // 5 + 5 + 5 = 15
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 1); // 1, total = 16
      } else if (firstGroupSize === 2) {
        // Two tied for lowest, two tied for highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 5); // 5 + 5 = 10
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 3); // 3 + 3 = 6, total = 16
      } else {
        // One lowest, three tied for highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 7); // 7
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 3); // 3 + 3 + 3 = 9, total = 16
      }
    } else if (sortedStrokes.length === 3) {
      if (strokeGroups[sortedStrokes[0]].length === 2) {
        // Two tied for lowest, one middle, one highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 6); // 6 + 6 = 12
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 3); // 3
        strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 1); // 1, total = 16
      } else if (strokeGroups[sortedStrokes[1]].length === 2) {
        // One lowest, two tied for middle, one highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 7); // 7
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 4); // 4 + 4 = 8
        strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 1); // 1, total = 16
      } else {
        // One lowest, one middle, two tied for highest
        strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 8); // 8
        strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 5); // 5
        strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 1.5); // 1.5 + 1.5 = 3, total = 16
      }
    } else {
      // All different - classic 6/4/2/0 doesn't sum to 16, need 7/5/3/1
      strokeGroups[sortedStrokes[0]].forEach(id => points[id] = 7); // Lowest
      strokeGroups[sortedStrokes[1]].forEach(id => points[id] = 5); // Second
      strokeGroups[sortedStrokes[2]].forEach(id => points[id] = 3); // Third
      strokeGroups[sortedStrokes[3]].forEach(id => points[id] = 1); // Highest, total = 16
    }
  }
  
  // Initialize all players to 0 points if not set
  playerIds.forEach(id => {
    if (points[id] === undefined) points[id] = 0;
  });
  
  return points;
}

/**
 * Calculate BBB points from hole data
 * Each hole has 3 categories: firstOn, closestTo, firstIn
 * Winner of each category gets 1 point
 */
export function calculateBBBPoints(
  bbbHoleData: Record<number, { firstOn?: string; closestTo?: string; firstIn?: string }>,
  playerIds: string[]
): Record<string, number> {
  const points: Record<string, number> = {};
  playerIds.forEach(id => points[id] = 0);

  Object.entries(bbbHoleData).forEach(([holeStr, holeData]) => {
    // Award 1 point to winner of each category
    if (holeData.firstOn && holeData.firstOn !== 'none' && playerIds.includes(holeData.firstOn)) {
      points[holeData.firstOn] += 1;
    }
    if (holeData.closestTo && holeData.closestTo !== 'none' && playerIds.includes(holeData.closestTo)) {
      points[holeData.closestTo] += 1;
    }
    if (holeData.firstIn && holeData.firstIn !== 'none' && playerIds.includes(holeData.firstIn)) {
      points[holeData.firstIn] += 1;
    }
  });

  return points;
}

/**
 * BBB Points Game calculation (pairwise comparison like 2/9/16)
 * Uses same pairwise logic as calculatePointsGame
 */
export function calculateBBBPointsGame(
  bbbHoleData: Record<number, { firstOn?: string; closestTo?: string; firstIn?: string }>,
  playerIds: string[],
  valuePerPoint: number = 1
): Record<string, number> {
  const bbbPoints = calculateBBBPoints(bbbHoleData, playerIds);
  return calculatePointsGame(bbbPoints, valuePerPoint);
}

/**
 * BBB FBT Game calculation (Front/Back/Total like 2/9/16)
 * Front = holes 1-9, Back = holes 10-18, Total = all holes
 */
export function calculateBBBFbtGame(
  bbbHoleData: Record<number, { firstOn?: string; closestTo?: string; firstIn?: string }>,
  playerIds: string[],
  potValue: number = 10
): Record<string, number> {
  const frontPoints: Record<string, number> = {};
  const backPoints: Record<string, number> = {};
  const totalPoints: Record<string, number> = {};
  
  // Initialize all players with 0 points
  playerIds.forEach(id => {
    frontPoints[id] = 0;
    backPoints[id] = 0;
    totalPoints[id] = 0;
  });

  // Aggregate points by segment
  Object.entries(bbbHoleData).forEach(([holeStr, holeData]) => {
    const hole = parseInt(holeStr, 10);
    const isFront = hole <= 9;

    // Award points for each category
    if (holeData.firstOn && holeData.firstOn !== 'none' && playerIds.includes(holeData.firstOn)) {
      totalPoints[holeData.firstOn] += 1;
      if (isFront) frontPoints[holeData.firstOn] += 1;
      else backPoints[holeData.firstOn] += 1;
    }
    if (holeData.closestTo && holeData.closestTo !== 'none' && playerIds.includes(holeData.closestTo)) {
      totalPoints[holeData.closestTo] += 1;
      if (isFront) frontPoints[holeData.closestTo] += 1;
      else backPoints[holeData.closestTo] += 1;
    }
    if (holeData.firstIn && holeData.firstIn !== 'none' && playerIds.includes(holeData.firstIn)) {
      totalPoints[holeData.firstIn] += 1;
      if (isFront) frontPoints[holeData.firstIn] += 1;
      else backPoints[holeData.firstIn] += 1;
    }
  });

  return calculateFbtGame(frontPoints, backPoints, totalPoints, potValue);
}