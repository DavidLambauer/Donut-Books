# Payout Settlement Transfers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show "who pays whom" settlement directions in the /payout command embed.

**Architecture:** Extract a pure `calculateSettlements(breakdown, salesByPlayer)` function, compute net balances (revenue held minus payout owed), then greedily match debtors to creditors. Display as a new "Settlements" embed field.

**Tech Stack:** Node.js (ES modules), vitest, discord-interactions

---

### Task 1: Extract and test `calculateSettlements` pure function

**Files:**
- Create: `src/lib/settlements.js`
- Create: `tests/lib/settlements.test.js`

**Step 1: Write the failing test**

In `tests/lib/settlements.test.js`:

```js
import { describe, it, expect } from "vitest";
import { calculateSettlements } from "../../src/lib/settlements.js";

describe("calculateSettlements", () => {
  it("calculates_transfers_when_one_seller_owes_two_investors", () => {
    // Player A sold $20M, invested $10M -> owed $13.33M -> net +$6.67M (debtor)
    // Player B invested $5M -> owed $6.67M -> net -$6.67M (creditor)
    const breakdown = [
      { discord_user_id: "1", username: "David", payout: 13333333 },
      { discord_user_id: "2", username: "Alex", payout: 6666667 },
    ];
    const salesByPlayer = {
      "1": { username: "David", revenue: 20000000 },
    };

    const settlements = calculateSettlements(breakdown, salesByPlayer);

    expect(settlements).toEqual([
      { from: "David", to: "Alex", amount: 6666667 },
    ]);
  });

  it("calculates_transfers_with_multiple_sellers_and_investors", () => {
    // A sold $10M, owed $4M -> net +$6M
    // B sold $5M, owed $4M -> net +$1M
    // C sold nothing, owed $7M -> net -$7M
    const breakdown = [
      { discord_user_id: "1", username: "Alice", payout: 4000000 },
      { discord_user_id: "2", username: "Bob", payout: 4000000 },
      { discord_user_id: "3", username: "Carol", payout: 7000000 },
    ];
    const salesByPlayer = {
      "1": { username: "Alice", revenue: 10000000 },
      "2": { username: "Bob", revenue: 5000000 },
    };

    const settlements = calculateSettlements(breakdown, salesByPlayer);

    // Alice owes $6M, Bob owes $1M, Carol receives $7M
    // Greedy: Alice (biggest debtor) -> Carol (biggest creditor): $6M
    // Then Bob -> Carol: $1M
    expect(settlements).toEqual([
      { from: "Alice", to: "Carol", amount: 6000000 },
      { from: "Bob", to: "Carol", amount: 1000000 },
    ]);
  });

  it("returns_empty_array_when_no_transfers_needed", () => {
    // Player A sold $5M, owed $5M -> net 0
    const breakdown = [
      { discord_user_id: "1", username: "Solo", payout: 5000000 },
    ];
    const salesByPlayer = {
      "1": { username: "Solo", revenue: 5000000 },
    };

    const settlements = calculateSettlements(breakdown, salesByPlayer);
    expect(settlements).toEqual([]);
  });

  it("handles_player_who_sold_but_has_no_expenses", () => {
    // A sold $10M, not in breakdown (no expenses) -> net +$10M
    // B in breakdown, owed $10M -> net -$10M
    const breakdown = [
      { discord_user_id: "2", username: "Bob", payout: 10000000 },
    ];
    const salesByPlayer = {
      "1": { username: "Alice", revenue: 10000000 },
    };

    const settlements = calculateSettlements(breakdown, salesByPlayer);
    expect(settlements).toEqual([
      { from: "Alice", to: "Bob", amount: 10000000 },
    ]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/settlements.test.js`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

In `src/lib/settlements.js`:

```js
export function calculateSettlements(breakdown, salesByPlayer) {
  const nets = {};

  // Every player in breakdown is owed their payout amount
  for (const entry of breakdown) {
    const revenue = salesByPlayer[entry.discord_user_id]?.revenue ?? 0;
    nets[entry.discord_user_id] = {
      username: entry.username,
      net: revenue - entry.payout,
    };
  }

  // Sellers not in breakdown (no expenses) hold all their revenue
  for (const [userId, seller] of Object.entries(salesByPlayer)) {
    if (!nets[userId]) {
      nets[userId] = {
        username: seller.username,
        net: seller.revenue,
      };
    }
  }

  // Split into debtors (positive net) and creditors (negative net)
  const debtors = [];
  const creditors = [];

  for (const [, player] of Object.entries(nets)) {
    if (player.net > 0) debtors.push({ ...player });
    else if (player.net < 0) creditors.push({ ...player, net: -player.net });
  }

  // Greedy settlement: match largest debtor with largest creditor
  const settlements = [];

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => b.net - a.net);
    creditors.sort((a, b) => b.net - a.net);

    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.net, creditor.net);

    settlements.push({ from: debtor.username, to: creditor.username, amount });

    debtor.net -= amount;
    creditor.net -= amount;

    if (debtor.net === 0) debtors.shift();
    if (creditor.net === 0) creditors.shift();
  }

  return settlements;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/settlements.test.js`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/lib/settlements.js tests/lib/settlements.test.js
git commit -m "feat: add calculateSettlements pure function with tests"
```

---

### Task 2: Integrate settlements into /payout command

**Files:**
- Modify: `src/commands/payout.js`

**Step 1: Write the failing test**

Update `tests/commands/payout.test.js` — change the sales mock to include seller info and add a test assertion for settlements:

```js
// In the existing mock, change the sales select return to include seller info:
// Old: data: [{ total_revenue: 20000000 }]
// New:
data: [{ discord_user_id: "1", discord_username: "David", total_revenue: 20000000 }]

// In the existing test, add this assertion after the breakdown check:
const settlements = embed.fields.find((f) => f.name === "Settlements");
expect(settlements.value).toContain("David");
expect(settlements.value).toContain("Alex");
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/payout.test.js`
Expected: FAIL - no "Settlements" field found

**Step 3: Implement the integration**

In `src/commands/payout.js`:

1. Add import: `import { calculateSettlements } from "../lib/settlements.js";`
2. Change sales query (line 8) from:
   `supabase.from("sales").select("total_revenue").is("payout_id", null)`
   to:
   `supabase.from("sales").select("discord_user_id, discord_username, total_revenue").is("payout_id", null)`
3. After building `breakdown` (after line 116), build `salesByPlayer`:
   ```js
   const salesByPlayer = {};
   for (const s of sales) {
     if (!salesByPlayer[s.discord_user_id]) {
       salesByPlayer[s.discord_user_id] = { username: s.discord_username, revenue: 0 };
     }
     salesByPlayer[s.discord_user_id].revenue += Number(s.total_revenue);
   }
   ```
4. Calculate settlements and format:
   ```js
   const settlements = calculateSettlements(breakdown, salesByPlayer);
   const settlementLines = settlements.map(
     (s) => `**${s.from}** → **${s.to}**: $${formatNumber(s.amount)}`
   );
   ```
5. Add the settlements field to the embed fields array (before footer), only if there are settlements:
   ```js
   if (settlementLines.length > 0) {
     fields.push({ name: "Settlements", value: settlementLines.join("\n") });
   }
   ```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/payout.test.js`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/commands/payout.js tests/commands/payout.test.js
git commit -m "feat: show settlement transfers in /payout embed"
```
