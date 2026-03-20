# History Command & Sales Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/history` command showing current cycle transactions, past cycle summaries, and a profit trend chart; also show per-player sales in `/balance`.

**Architecture:** New `history.js` command handler queries expenses+sales (current cycle) and payouts (past cycles). A `buildChartUrl` helper constructs a QuickChart.io line chart URL from payout data. The `/balance` command is updated to track per-player sales revenue alongside expenses.

**Tech Stack:** Node.js (ES modules), vitest, QuickChart.io (no dependency — URL-based API), discord-interactions

---

### Task 1: Create `buildChartUrl` helper with tests

**Files:**
- Create: `src/lib/chart.js`
- Create: `tests/lib/chart.test.js`

**Step 1: Write the failing test**

In `tests/lib/chart.test.js`:

```js
import { describe, it, expect } from "vitest";
import { buildChartUrl } from "../../src/lib/chart.js";

describe("buildChartUrl", () => {
  it("builds_line_chart_url_from_payout_data", () => {
    const payouts = [
      { settled_at: "2026-03-08T00:00:00Z", total_profit: 3000000 },
      { settled_at: "2026-03-15T00:00:00Z", total_profit: 5000000 },
    ];

    const url = buildChartUrl(payouts);

    expect(url).toContain("https://quickchart.io/chart");
    expect(url).toContain("line");
    expect(url).toContain("Mar 8");
    expect(url).toContain("Mar 15");
    expect(url).toContain("3000000");
    expect(url).toContain("5000000");
  });

  it("returns_null_when_no_payouts", () => {
    const url = buildChartUrl([]);
    expect(url).toBeNull();
  });

  it("handles_single_payout", () => {
    const payouts = [
      { settled_at: "2026-03-10T00:00:00Z", total_profit: 2000000 },
    ];

    const url = buildChartUrl(payouts);

    expect(url).toContain("https://quickchart.io/chart");
    expect(url).toContain("2000000");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/chart.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

In `src/lib/chart.js`:

```js
export function buildChartUrl(payouts) {
  if (payouts.length === 0) return null;

  const labels = payouts.map((p) => {
    const d = new Date(p.settled_at);
    return `${d.toLocaleString("en-US", { month: "short" })} ${d.getUTCDate()}`;
  });

  const data = payouts.map((p) => Number(p.total_profit));

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Profit",
        data,
        borderColor: "#57f287",
        backgroundColor: "rgba(87,242,135,0.1)",
        fill: true,
      }],
    },
    options: {
      scales: {
        y: { beginAtZero: true },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encoded}&w=500&h=250&bkg=rgb(47,49,54)`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/chart.test.js`
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/lib/chart.js tests/lib/chart.test.js
git commit -m "feat: add buildChartUrl helper for profit trend charts"
```

---

### Task 2: Create `/history` command with tests

**Files:**
- Create: `src/commands/history.js`
- Create: `tests/commands/history.test.js`

**Step 1: Write the failing test**

In `tests/commands/history.test.js`:

```js
import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "expenses") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    discord_username: "David",
                    item: "Bone Blocks",
                    quantity: 64,
                    total_cost: 2000000,
                    created_at: "2026-03-18T10:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "sales") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    discord_username: "Alex",
                    quantity: 128,
                    total_revenue: 5000000,
                    created_at: "2026-03-19T14:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "payouts") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  settled_at: "2026-03-15T00:00:00Z",
                  total_revenue: 20000000,
                  total_profit: 5000000,
                },
              ],
              error: null,
            }),
          }),
        }),
      };
    }
  });
  return { default: { from: fromMock } };
});

import { handleHistory } from "../../src/commands/history.js";

describe("handleHistory", () => {
  it("shows_current_transactions_and_past_cycles", async () => {
    const result = await handleHistory({});

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("History");

    const transactions = embed.fields.find((f) => f.name === "Current Cycle");
    expect(transactions.value).toContain("David");
    expect(transactions.value).toContain("Bone Blocks");
    expect(transactions.value).toContain("Alex");
    expect(transactions.value).toContain("sold");

    const pastCycles = embed.fields.find((f) => f.name === "Past Cycles");
    expect(pastCycles.value).toContain("$5,000,000");

    expect(embed.image.url).toContain("quickchart.io");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/history.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

In `src/commands/history.js`:

```js
import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";
import { buildChartUrl } from "../lib/chart.js";

export async function handleHistory(interaction) {
  const [expensesResult, salesResult, payoutsResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("discord_username, item, quantity, total_cost, created_at")
      .is("payout_id", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sales")
      .select("discord_username, quantity, total_revenue, created_at")
      .is("payout_id", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payouts")
      .select("settled_at, total_revenue, total_profit")
      .order("settled_at", { ascending: false })
      .limit(5),
  ]);

  if (expensesResult.error || salesResult.error || payoutsResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Error",
          description: "Failed to fetch history data.",
          color: 0xff0000,
        }],
      },
    };
  }

  const expenses = expensesResult.data;
  const sales = salesResult.data;
  const payouts = payoutsResult.data;

  if (expenses.length === 0 && sales.length === 0 && payouts.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "History",
          description: "Nothing to show. Use `/expense` or `/sale` to get started.",
          color: 0x5865f2,
        }],
      },
    };
  }

  const fields = [];

  // Current cycle transactions
  const transactions = [
    ...expenses.map((e) => ({
      date: new Date(e.created_at),
      text: `**${e.discord_username}** bought ${e.quantity} ${e.item} ($${formatNumber(e.total_cost)})`,
    })),
    ...sales.map((s) => ({
      date: new Date(s.created_at),
      text: `**${s.discord_username}** sold ${s.quantity} Dried Kelp Blocks ($${formatNumber(s.total_revenue)})`,
    })),
  ].sort((a, b) => b.date - a.date).slice(0, 10);

  if (transactions.length > 0) {
    const totalTransactions = expenses.length + sales.length;
    const lines = transactions.map((t) => {
      const dateStr = t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      return `${dateStr} — ${t.text}`;
    });
    if (totalTransactions > 10) {
      lines.push(`*(+${totalTransactions - 10} more)*`);
    }
    fields.push({ name: "Current Cycle", value: lines.join("\n") });
  } else {
    fields.push({ name: "Current Cycle", value: "No transactions yet this cycle." });
  }

  // Past cycles
  if (payouts.length > 0) {
    const cycleLines = payouts.map((p, i) => {
      const d = new Date(p.settled_at);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const profitSign = Number(p.total_profit) >= 0 ? "+" : "";
      return `**Cycle ${payouts.length - i}** (${dateStr}) — Revenue: $${formatNumber(p.total_revenue)} · Profit: ${profitSign}$${formatNumber(p.total_profit)}`;
    });
    fields.push({ name: "Past Cycles", value: cycleLines.join("\n") });
  }

  // Chart
  const chartUrl = payouts.length > 0 ? buildChartUrl([...payouts].reverse()) : null;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: "History",
        color: 0x5865f2,
        fields,
        ...(chartUrl ? { image: { url: chartUrl } } : {}),
      }],
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/history.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/history.js tests/commands/history.test.js
git commit -m "feat: add /history command with transactions, past cycles, and chart"
```

---

### Task 3: Register `/history` command and wire it up

**Files:**
- Modify: `src/register.js`
- Modify: `api/interactions.js`

**Step 1: Add history to command registration**

In `src/register.js`, add to the `commands` array (after the `calculate` entry):

```js
  {
    name: "history",
    description: "View transaction history and profit trends",
  },
```

**Step 2: Wire handler in interactions endpoint**

In `api/interactions.js`, add import at top:

```js
import { handleHistory } from "../src/commands/history.js";
```

Add to the `commands` object inside the handler:

```js
    const commands = {
      expense: handleExpense,
      sale: handleSale,
      balance: handleBalance,
      payout: handlePayout,
      calculate: handleCalculate,
      history: handleHistory,
    };
```

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/register.js api/interactions.js
git commit -m "feat: register /history command and wire handler"
```

---

### Task 4: Add per-player sales to `/balance`

**Files:**
- Modify: `src/commands/balance.js`
- Modify: `tests/commands/balance.test.js`

**Step 1: Update balance test**

In `tests/commands/balance.test.js`, find the sales mock data and change it to include seller info. Find:

```js
data: [{ total_revenue: 20000000 }],
```

Change to:

```js
data: [{ discord_user_id: "1", discord_username: "David", total_revenue: 20000000 }],
```

Add an assertion for sales breakdown in the existing test. After the line that checks for "Player Breakdown", add:

```js
    const salesBreakdown = embed.fields.find((f) => f.name === "Sales Breakdown");
    expect(salesBreakdown.value).toContain("David");
    expect(salesBreakdown.value).toContain("$20,000,000");
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commands/balance.test.js`
Expected: FAIL — no "Sales Breakdown" field

**Step 3: Implement per-player sales in balance**

In `src/commands/balance.js`:

**A)** Update sales query (line 8) from:
```js
supabase.from("sales").select("total_revenue").is("payout_id", null),
```
to:
```js
supabase.from("sales").select("discord_user_id, discord_username, total_revenue").is("payout_id", null),
```

**B)** In the "sales only" early return (around line 40), add a sales breakdown before the return. Replace the block from `if (expenses.length === 0 && sales.length > 0)` through its return with:

```js
  if (expenses.length === 0 && sales.length > 0) {
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_revenue), 0);
    const sellerTotals = {};
    for (const s of sales) {
      if (!sellerTotals[s.discord_user_id]) {
        sellerTotals[s.discord_user_id] = { username: s.discord_username, revenue: 0 };
      }
      sellerTotals[s.discord_user_id].revenue += Number(s.total_revenue);
    }
    const salesLines = Object.values(sellerTotals)
      .sort((a, b) => b.revenue - a.revenue)
      .map((s) => `**${s.username}**: $${formatNumber(s.revenue)}`);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Current Cycle",
          color: 0x57f287,
          fields: [
            { name: "Total Expenses", value: "$0", inline: true },
            { name: "Total Revenue", value: `$${formatNumber(totalRevenue)}`, inline: true },
            { name: "Profit", value: `$${formatNumber(totalRevenue)}`, inline: true },
            { name: "Sales Breakdown", value: salesLines.join("\n") },
          ],
          description: "No expenses yet — all revenue is pure profit. Log expenses with `/expense` if there are any.",
          footer: { text: "Use /payout to settle this cycle" },
        }],
      },
    };
  }
```

**C)** In the main path (after building `playerLines`, before the return), add sales aggregation and a "Sales Breakdown" field:

```js
  const sellerTotals = {};
  for (const s of sales) {
    if (!sellerTotals[s.discord_user_id]) {
      sellerTotals[s.discord_user_id] = { username: s.discord_username, revenue: 0 };
    }
    sellerTotals[s.discord_user_id].revenue += Number(s.total_revenue);
  }
  const salesLines = Object.values(sellerTotals)
    .sort((a, b) => b.revenue - a.revenue)
    .map((s) => `**${s.username}**: $${formatNumber(s.revenue)}`);
```

Then add the field to the embed fields array, after "Player Breakdown":

```js
  { name: "Sales Breakdown", value: salesLines.join("\n") },
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commands/balance.test.js`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/commands/balance.js tests/commands/balance.test.js
git commit -m "feat: show per-player sales breakdown in /balance"
```
