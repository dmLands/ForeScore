# ForeScore V9.0 Design Guidelines

## Design Approach: Design System Foundation
**Selected System**: Material Design with custom refinements for data-dense golf scoring
**Rationale**: Perfect for information-heavy interfaces requiring clear hierarchy, strong visual feedback for calculations, and excellent data table patterns

## Core Design Elements

### Typography
- **Primary Font**: Inter (via Google Fonts CDN)
- **Headings**: 
  - H1: 2xl (24px), semibold - Page titles
  - H2: xl (20px), semibold - Section headers
  - H3: lg (18px), medium - Tab labels, card headers
- **Body**: Base (16px), regular - All content, table data
- **Small**: sm (14px), regular - Helper text, timestamps
- **Numeric Data**: Tabular nums for aligned scoring/currency

### Layout System
**Spacing Primitives**: Use Tailwind units: 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6 (cards), p-4 (compact elements)
- Section gaps: gap-8 (between major sections)
- Element spacing: space-y-4 (forms), gap-2 (button groups)
- Container: max-w-7xl mx-auto px-4

### Component Library

**Navigation**
- Horizontal tab bar with active state underline (border-b-2)
- Tab buttons: px-6 py-4 with smooth transitions
- Active tab distinguished by underline only (not background)
- Sticky positioning (sticky top-0) for always-visible game type switching

**Data Tables (Leaderboards)**
- Striped rows for readability (alternate row backgrounds)
- Prominent header row with semibold text
- Right-aligned numeric columns (money, scores)
- Compact row height (h-12) for information density
- Highlight winning/top positions with subtle accent treatment

**Cards (Player/Payout Cards)**
- Elevated cards (shadow-md) for grouping related data
- Rounded corners (rounded-lg) for modern feel
- Inner padding: p-6 for breathing room
- Grid layouts for multiple cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Forms (Calculation Inputs)**
- Stacked label-above-input pattern
- Input fields: border, rounded-md, px-4 py-2
- Clear visual hierarchy: Label (font-medium) → Input → Helper text (text-sm)
- Group related inputs in sections with gap-6

**Buttons**
- Primary actions: Solid filled with medium shadow
- Secondary actions: Outlined (border-2) with transparent background
- Size: px-6 py-3 for comfortable tap targets
- Icons from Heroicons (CDN) positioned left of text

**Status Indicators**
- Pills/badges for game status: rounded-full px-3 py-1 text-sm
- Live indicators: Small dot (w-2 h-2 rounded-full) + "Live" text
- Payout totals: Prominent display in dedicated summary cards

## Key Interface Patterns

**Tabbed Game Type Navigation**
Full-width horizontal tabs at top with Cards, 2/9/16, BBB, GIR, Nassau
Each tab shows different scoring interface with consistent layout structure

**Leaderboard Display**
Table format with columns: Rank, Player Name, Score, Payout (right-aligned)
Running total row at bottom (font-semibold, border-t-2)
Update timestamps shown above table (text-sm)

**Payout Calculator**
Two-column layout (md:grid-cols-2): Input forms left, live calculation preview right
Sticky summary card showing total payouts
Clear "Calculate" primary action button

**Responsive Strategy**
- Mobile (base): Single column, stacked tables scroll horizontally
- Tablet (md:): Two-column forms, full-width tables
- Desktop (lg:): Multi-column cards, expanded table views

## Nassau Terminology Update
Replace all "FBT" references with "Nassau" maintaining same UI positioning and styling
Update tab labels, section headers, form labels consistently

## No Hero Section
This is a functional app interface - launch directly into tabbed navigation with active game type displayed

## Critical Implementation Notes
- Maintain gray color scheme foundation (defer specific shades to implementation)
- Prioritize scannable data: clear typography hierarchy, aligned numbers, adequate whitespace
- Use shadow-sm for subtle depth on interactive elements
- Ensure all touch targets minimum 44x44px for mobile usability
- Tab persistence: Highlight active tab state clearly across all viewports