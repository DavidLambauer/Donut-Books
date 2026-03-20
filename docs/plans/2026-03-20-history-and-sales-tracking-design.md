# History Command & Per-Sale Tracking

## New Command: `/history`

Single command, no arguments. Returns a Discord embed with three sections:

### 1. Current Cycle Transactions
Chronological list of all expenses and sales where `payout_id IS NULL`. Shows who did what:
```
Mar 18 — David bought 64 Bone Blocks ($2,000,000)
Mar 19 — Alex sold 128 Dried Kelp Blocks ($5,000,000)
Mar 20 — David sold 256 Dried Kelp Blocks ($10,000,000)
```
Capped at 10 most recent. If more exist, show "(+N more)".

### 2. Past Cycles
Last 5 settled payouts from the `payouts` table, ordered by `settled_at DESC`:
```
Cycle 5 (Mar 15) — Revenue: $20M · Profit: $5M
Cycle 4 (Mar 8)  — Revenue: $15M · Profit: $3M
```

### 3. Profit Trend Chart
Line chart via QuickChart.io showing profit over settled cycles. Embedded as `embed.image.url`.

## Modified Command: `/balance`

Add per-player sales revenue to the breakdown. Expand sales query to include `discord_user_id, discord_username` and aggregate per-player revenue alongside per-player expenses.

## Edge Cases
- No past cycles: skip Past Cycles section and chart
- No current transactions: show "No transactions yet this cycle"
- Empty everything: "Nothing to show. Use /expense or /sale to get started."
- Transaction list > 10: show last 10 + "(+N more)"
- QuickChart fails/times out: skip chart, show text data only
- Only 1 past cycle: still show chart (single data point)

## Data
- No DB schema changes needed
- All data already exists in expenses, sales, and payouts tables
