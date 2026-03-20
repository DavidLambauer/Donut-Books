# Payout Settlement Transfers

## Problem
When multiple players make sales, it's unclear who needs to pay whom. The /payout command shows each player's total owed but not the actual transfer directions.

## Design

### Data Changes
- Fetch `discord_user_id, discord_username, total_revenue` from sales (currently only fetches `total_revenue`)
- Track per-player revenue alongside per-player expenses

### Algorithm
1. For each player, calculate: `net = revenue_held - payout_owed`
2. Positive net = debtor (holding more than owed), negative net = creditor (owed more than held)
3. Greedy settlement: repeatedly match largest debtor with largest creditor, transfer the min of the two amounts

### Display
New embed field "Settlements" below Player Breakdown:
```
Settlements
Player A -> Player B: $300
Player A -> Player C: $300
```

### Edge Cases
- Player who only sold (no expenses): pure debtor
- Player who only spent (no sales): pure creditor
- "Sales only, no expenses" early-return path: unchanged ("split it however you like")
- Player with net 0: omitted from settlements

### No DB Changes
All computed at payout time from existing data.
