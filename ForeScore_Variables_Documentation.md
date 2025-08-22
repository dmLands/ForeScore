# ForeScore V1 - Complete Variables Documentation

## Database Schema Variables

### Groups Table (`groups`)
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `id` | varchar | Primary key, auto-generated UUID | `gen_random_uuid()` |
| `name` | text | Group name | Required |
| `players` | json | Array of Player objects | Required |
| `cardValues` | json | CardValues object with card penalty amounts | `{camel: 2, fish: 2, roadrunner: 2, ghost: 2, skunk: 2, snake: 2, yeti: 2}` |
| `customCards` | json | Array of CustomCard objects | `[]` |
| `groupPhoto` | text | Base64 encoded image data | Optional |
| `shareCode` | varchar(8) | Unique share code for joining group | Auto-generated |
| `createdBy` | varchar | User identifier who created group | Optional |
| `createdAt` | timestamp | Creation timestamp | `defaultNow()` |
| `lastPlayed` | timestamp | Last activity timestamp | Optional |

### Game States Table (`gameStates`)
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `id` | varchar | Primary key, auto-generated UUID | `gen_random_uuid()` |
| `groupId` | varchar | Foreign key to groups table | Required |
| `name` | text | Game session name | `"Game"` |
| `deck` | json | Array of Card objects in deck | Required |
| `playerCards` | json | Record mapping player IDs to Card arrays | Required |
| `cardHistory` | json | Array of CardAssignment objects | `[]` |
| `currentCard` | json | Currently drawn Card object or null | Optional |
| `isActive` | integer | Active status flag (1 = active, 0 = inactive) | `1` |
| `shareCode` | varchar(8) | Unique share code for joining game | Auto-generated |
| `cardValues` | json | CardValues object for this game session | `{camel: 2, fish: 2, roadrunner: 2, ghost: 2, skunk: 2, snake: 2, yeti: 2}` |
| `createdAt` | timestamp | Creation timestamp | `defaultNow()` |

### Points Games Table (`pointsGames`)
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `id` | varchar | Primary key, auto-generated UUID | `gen_random_uuid()` |
| `groupId` | varchar | Foreign key to groups table (cascade delete) | Required |
| `name` | varchar | Points game name | Required |
| `holes` | jsonb | Record mapping hole numbers to player stroke counts | `{}` |
| `points` | jsonb | Record mapping hole numbers to player point values | `{}` |
| `createdAt` | timestamp | Creation timestamp | `defaultNow()` |
| `updatedAt` | timestamp | Last update timestamp | `defaultNow()` |

## TypeScript Interface Variables

### Player Interface
| Variable | Type | Description |
|----------|------|-------------|
| `id` | string | Unique player identifier |
| `name` | string | Player's full name |
| `initials` | string | Player's initials (1-3 characters) |
| `color` | string | Hex color code for player identification |

### Card Interface
| Variable | Type | Description |
|----------|------|-------------|
| `id` | string | Unique card identifier |
| `type` | `'camel' \| 'fish' \| 'roadrunner' \| 'ghost' \| 'skunk' \| 'snake' \| 'yeti' \| 'custom'` | Card type identifier |
| `emoji` | string | Emoji representation of card |
| `name` | string (optional) | Custom name for custom cards |

### CustomCard Interface
| Variable | Type | Description |
|----------|------|-------------|
| `id` | string | Unique custom card identifier |
| `name` | string | Custom card name |
| `emoji` | string | Custom card emoji |
| `value` | number | Penalty value for custom card |

### CardValues Interface
| Variable | Type | Description |
|----------|------|-------------|
| `camel` | number | Penalty value for camel cards |
| `fish` | number | Penalty value for fish cards |
| `roadrunner` | number | Penalty value for roadrunner cards |
| `ghost` | number | Penalty value for ghost cards |
| `skunk` | number | Penalty value for skunk cards |
| `snake` | number | Penalty value for snake cards |
| `yeti` | number | Penalty value for yeti cards |
| `[key: string]` | number | Dynamic penalty values for custom cards |

### CardAssignment Interface
| Variable | Type | Description |
|----------|------|-------------|
| `cardId` | string | ID of assigned card |
| `cardType` | `'camel' \| 'fish' \| 'roadrunner' \| 'ghost' \| 'skunk' \| 'snake' \| 'yeti' \| 'custom'` | Type of assigned card |
| `playerId` | string | ID of player receiving card |
| `playerName` | string | Name of player receiving card |
| `assignedAt` | Date | Timestamp of assignment |

## Frontend State Variables (React)

### Main Component State (`client/src/pages/home.tsx`)
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `currentTab` | `'games' \| 'deck' \| 'scoreboard' \| 'rules' \| 'points'` | Active navigation tab | `'games'` |
| `selectedGroup` | `Group \| null` | Currently selected group | `null` |
| `selectedGame` | `GameState \| null` | Currently selected game session | `null` |
| `selectedPointsGame` | `PointsGame \| null` | Currently selected points game | `null` |
| `selectedHole` | number | Currently selected hole in points game | `1` |
| `holeStrokes` | `Record<string, string>` | Player stroke inputs for current hole | `{}` |
| `pointValue` | string | Dollar value per point in points game | `"1.00"` |
| `fbtValue` | string | Dollar value for FBT (Front/Back/Total) payouts | `"10.00"` |
| `payoutMode` | `'points' \| 'fbt'` | Selected payout calculation mode | `'points'` |
| `createGroupOpen` | boolean | Create group dialog visibility | `false` |
| `showCreateGroupModal` | boolean | Create group modal visibility | `false` |
| `assignCardOpen` | boolean | Assign card dialog visibility | `false` |
| `selectedCardType` | `string \| null` | Currently selected card type for assignment | `null` |
| `showShareDialog` | boolean | Share code dialog visibility | `false` |
| `showJoinDialog` | boolean | Join game dialog visibility | `false` |
| `joinCode` | string | Input value for join code | `""` |
| `showCreateCardDialog` | boolean | Create custom card dialog visibility | `false` |
| `showCreateGameDialog` | boolean | Create new game dialog visibility | `false` |
| `newGameName` | string | Input value for new game name | `""` |
| `customCardName` | string | Input value for custom card name | `""` |
| `customCardEmoji` | string | Input value for custom card emoji | `""` |
| `customCardValue` | string | Input value for custom card penalty value | `"15"` |
| `showPointValueTooltip` | boolean | Point value tooltip visibility | `false` |
| `showFbtValueTooltip` | boolean | FBT value tooltip visibility | `false` |

### Query Variables (TanStack Query)
| Variable | Type | Description |
|----------|------|-------------|
| `groups` | `Group[]` | All available groups | `[]` |
| `groupsLoading` | boolean | Loading state for groups query |
| `groupGames` | `GameState[]` | Games for selected group | `[]` |
| `pointsGames` | `PointsGame[]` | Points games for selected group | `[]` |
| `gameState` | `GameState \| undefined` | Current game state from hook |
| `gameLoading` | boolean | Loading state for game state |
| `isConnected` | boolean | WebSocket connection status |

## Storage Interface Variables (`server/storage.ts`)

### IStorage Methods
| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `getGroups()` | none | `Promise<Group[]>` | Retrieve all groups |
| `getGroup(id)` | `id: string` | `Promise<Group \| undefined>` | Get group by ID |
| `getGroupByShareCode(shareCode)` | `shareCode: string` | `Promise<Group \| undefined>` | Get group by share code |
| `createGroup(group)` | `group: InsertGroup` | `Promise<Group>` | Create new group |
| `updateGroup(id, updates)` | `id: string, updates: Partial<InsertGroup>` | `Promise<Group \| undefined>` | Update existing group |
| `deleteGroup(id)` | `id: string` | `Promise<boolean>` | Delete group |
| `getGameState(groupId)` | `groupId: string` | `Promise<GameState \| undefined>` | Get active game state for group |
| `getGameStates(groupId)` | `groupId: string` | `Promise<GameState[]>` | Get all game states for group |
| `getGameStateById(id)` | `id: string` | `Promise<GameState \| undefined>` | Get game state by ID |
| `getGameStateByShareCode(shareCode)` | `shareCode: string` | `Promise<GameState \| undefined>` | Get game state by share code |
| `createGameState(gameState)` | `gameState: InsertGameState` | `Promise<GameState>` | Create new game state |
| `updateGameState(id, updates)` | `id: string, updates: Partial<InsertGameState>` | `Promise<GameState \| undefined>` | Update game state |
| `deleteGameState(id)` | `id: string` | `Promise<boolean>` | Delete game state |
| `getPointsGames(groupId)` | `groupId: string` | `Promise<PointsGame[]>` | Get points games for group |
| `getPointsGamesByGroup(groupId)` | `groupId: string` | `Promise<PointsGame[]>` | Get points games by group |
| `getPointsGame(id)` | `id: string` | `Promise<PointsGame \| undefined>` | Get points game by ID |
| `createPointsGame(pointsGame)` | `pointsGame: InsertPointsGame` | `Promise<PointsGame>` | Create new points game |
| `updatePointsGame(id, updates)` | `id: string, updates: Partial<PointsGame>` | `Promise<PointsGame \| undefined>` | Update points game |
| `updateHoleScores(gameId, hole, strokes, points)` | `gameId: string, hole: number, strokes: Record<string, number>, points: Record<string, number>` | `Promise<PointsGame \| undefined>` | Update hole scores and points |
| `deletePointsGame(id)` | `id: string` | `Promise<boolean>` | Delete points game |

## Validation Schema Variables (Zod)

### insertGroupSchema
Validates group creation input, omitting auto-generated fields (`id`, `createdAt`)

### insertGameStateSchema  
Validates game state creation input, omitting auto-generated fields (`id`, `createdAt`)

### insertPointsGameSchema
Validates points game creation input, omitting auto-generated fields (`id`, `createdAt`, `updatedAt`)

### playerSchema
| Field | Validation | Description |
|-------|------------|-------------|
| `id` | `z.string()` | Required string identifier |
| `name` | `z.string().min(1, "Name is required")` | Required non-empty name |
| `initials` | `z.string().min(1).max(3)` | 1-3 character initials |
| `color` | `z.string().default("#0EA5E9")` | Color with default blue |

### cardValuesSchema
| Field | Validation | Description |
|-------|------------|-------------|
| `camel` | `z.number().min(0)` | Non-negative camel card value |
| `fish` | `z.number().min(0)` | Non-negative fish card value |
| `roadrunner` | `z.number().min(0)` | Non-negative roadrunner card value |
| `ghost` | `z.number().min(0)` | Non-negative ghost card value |
| `skunk` | `z.number().min(0)` | Non-negative skunk card value |
| `snake` | `z.number().min(0)` | Non-negative snake card value |
| `yeti` | `z.number().min(0)` | Non-negative yeti card value |
| `catchall` | `z.number().min(0)` | Non-negative values for custom cards |

## Type Exports

### Core Types
- `InsertGroup` - Type for creating groups (inferred from insertGroupSchema)
- `Group` - Type for group database records (inferred from groups table)
- `InsertGameState` - Type for creating game states (inferred from insertGameStateSchema)
- `GameState` - Type for game state database records (inferred from gameStates table)
- `PointsGame` - Type for points game database records (inferred from pointsGames table)
- `InsertPointsGame` - Type for creating points games (inferred from insertPointsGameSchema)

## Constants

### Default Card Values
```typescript
{
  camel: 2,
  fish: 2,
  roadrunner: 2,
  ghost: 2,
  skunk: 2,
  snake: 2,
  yeti: 2
}
```

### Player Colors
```typescript
[
  "#0EA5E9", // Sky blue
  "#10B981", // Emerald green  
  "#F59E0B", // Amber
  "#EF4444", // Red
]
```

### Card Types
```typescript
'camel' | 'fish' | 'roadrunner' | 'ghost' | 'skunk' | 'snake' | 'yeti' | 'custom'
```

### Navigation Tabs
```typescript
'games' | 'deck' | 'scoreboard' | 'rules' | 'points'
```

### Payout Modes
```typescript
'points' | 'fbt'
```

---

**Generated:** January 2025  
**Project:** ForeScore V1  
**Version:** Complete Implementation with CardGamePayments Algorithm