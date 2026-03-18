# Kelp Farm Discord Bot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Discord bot hosted on Vercel with Supabase that tracks shared kelp farm expenses/sales and calculates proportional profit payouts.

**Architecture:** Discord Interactions Endpoint on Vercel (serverless). Single `/api/interactions` route receives Discord webhook POSTs, verifies signature, routes to command handlers that query Supabase Postgres.

**Tech Stack:** Node.js, discord-interactions (signature verification + types), @supabase/supabase-js, Vercel (hosting)

---

### Task 1: Project Setup and Dependencies

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `vercel.json`

**Step 1: Initialize project**

```bash
cd /Users/david/Herd/kelp-team-discord-bot
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install discord-interactions @supabase/supabase-js
```

**Step 3: Create .env.example**

```env
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

**Step 4: Create .gitignore**

```
node_modules/
.env
.vercel/
```

**Step 5: Create vercel.json**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/interactions.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/interactions",
      "dest": "/api/interactions.js"
    }
  ]
}
```

**Step 6: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore vercel.json
git commit -m "feat: initialize project with dependencies and Vercel config"
```

---

### Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/schema.sql`

**Step 1: Create the SQL migration file**

```sql
-- Payouts table (referenced by expenses and sales)
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_expenses DECIMAL NOT NULL DEFAULT 0,
  total_revenue DECIMAL NOT NULL DEFAULT 0,
  total_profit DECIMAL NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  item TEXT NOT NULL CHECK (item IN ('Bone Blocks', 'Bones', 'Blaze Rods', 'Chests', 'Shulker Shells', 'Shulkers')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_cost DECIMAL NOT NULL CHECK (total_cost > 0),
  payout_id UUID REFERENCES payouts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_revenue DECIMAL NOT NULL CHECK (total_revenue > 0),
  payout_id UUID REFERENCES payouts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast unsettled queries
CREATE INDEX idx_expenses_unsettled ON expenses(payout_id) WHERE payout_id IS NULL;
CREATE INDEX idx_sales_unsettled ON sales(payout_id) WHERE payout_id IS NULL;
```

**Step 2: Run this SQL in the Supabase dashboard**

Go to Supabase > SQL Editor > paste and run. This is a manual step — Supabase free tier doesn't support CLI migrations.

**Step 3: Commit**

```bash
mkdir -p supabase
git add supabase/schema.sql
git commit -m "feat: add database schema for expenses, sales, and payouts"
```

---

### Task 3: Supabase Client and Discord Helpers

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/lib/discord.js`

**Step 1: Create Supabase client**

```javascript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export default supabase;
```

**Step 2: Create Discord helpers**

```javascript
import { verifyKey } from "discord-interactions";

export async function verifyDiscordRequest(req) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  const isValid = await verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  return isValid;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function formatNumber(num) {
  return Number(num).toLocaleString("en-US");
}
```

**Step 3: Commit**

```bash
git add src/lib/supabase.js src/lib/discord.js
git commit -m "feat: add Supabase client and Discord helper utilities"
```

---

### Task 4: Interactions Endpoint and Command Router

**Files:**
- Create: `api/interactions.js`

**Step 1: Create the serverless function**

```javascript
import { InteractionType, InteractionResponseType } from "discord-interactions";
import { verifyDiscordRequest, jsonResponse } from "../src/lib/discord.js";
import { handleExpense } from "../src/commands/expense.js";
import { handleSale } from "../src/commands/sale.js";
import { handleBalance } from "../src/commands/balance.js";
import { handlePayout } from "../src/commands/payout.js";

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).end("Method not allowed");
  }

  // Verify Discord signature
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const rawBody = JSON.stringify(req.body);

  const isValid = await verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return res.status(401).end("Invalid request signature");
  }

  const interaction = req.body;

  // Handle Discord PING (required for endpoint verification)
  if (interaction.type === InteractionType.PING) {
    return res.json({ type: InteractionResponseType.PONG });
  }

  // Handle slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;

    const commands = {
      expense: handleExpense,
      sale: handleSale,
      balance: handleBalance,
      payout: handlePayout,
    };

    const handler = commands[name];
    if (!handler) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Unknown command." },
      });
    }

    try {
      const response = await handler(interaction);
      return res.json(response);
    } catch (error) {
      console.error(`Error handling /${name}:`, error);
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Something went wrong. Please try again." },
      });
    }
  }

  return res.status(400).end("Unknown interaction type");
}
```

Note: We need to import `verifyKey` at the top — add it to the import from discord-interactions.

**Step 2: Commit**

```bash
git add api/interactions.js
git commit -m "feat: add interactions endpoint with command routing"
```

---

### Task 5: /expense Command

**Files:**
- Create: `src/commands/expense.js`
- Create: `tests/commands/expense.test.js`

**Step 1: Write the test**

```javascript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleExpense } from "../../src/commands/expense.js";
import { InteractionResponseType } from "discord-interactions";

// Mock supabase
vi.mock("../../src/lib/supabase.js", () => {
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "test-uuid" },
        error: null,
      }),
    }),
  });
  return {
    default: {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    },
  };
});

function makeInteraction(item, quantity, total) {
  return {
    member: {
      user: { id: "123456", username: "TestUser" },
    },
    data: {
      options: [
        { name: "item", value: item },
        { name: "quantity", value: quantity },
        { name: "total", value: total },
      ],
    },
  };
}

describe("handleExpense", () => {
  it("logs_an_expense_and_returns_confirmation", async () => {
    const interaction = makeInteraction("Bone Blocks", 300000, 10000000);
    const result = await handleExpense(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.content).toContain("Bone Blocks");
    expect(result.data.content).toContain("300,000");
    expect(result.data.content).toContain("10,000,000");
    expect(result.data.content).toContain("TestUser");
  });

  it("shows_per_unit_price", async () => {
    const interaction = makeInteraction("Blaze Rods", 500, 75000);
    const result = await handleExpense(interaction);

    expect(result.data.content).toContain("150"); // 75000/500 = 150 per unit
  });
});
```

**Step 2: Install vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run tests/commands/expense.test.js
```

Expected: FAIL — `handleExpense` module not found.

**Step 4: Implement /expense handler**

```javascript
import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";

export async function handleExpense(interaction) {
  const user = interaction.member.user;
  const options = interaction.data.options;

  const item = options.find((o) => o.name === "item").value;
  const quantity = options.find((o) => o.name === "quantity").value;
  const totalCost = options.find((o) => o.name === "total").value;

  const { error } = await supabase.from("expenses").insert({
    discord_user_id: user.id,
    discord_username: user.username,
    item,
    quantity,
    total_cost: totalCost,
  });

  if (error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Failed to log expense: ${error.message}` },
    };
  }

  const perUnit = totalCost / quantity;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Logged ${formatNumber(quantity)} ${item} for $${formatNumber(totalCost)} ($${formatNumber(perUnit)}/ea) by ${user.username}`,
    },
  };
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run tests/commands/expense.test.js
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/commands/expense.js tests/commands/expense.test.js package.json package-lock.json
git commit -m "feat: add /expense command with tests"
```

---

### Task 6: /sale Command

**Files:**
- Create: `src/commands/sale.js`
- Create: `tests/commands/sale.test.js`

**Step 1: Write the test**

```javascript
import { describe, it, expect, vi } from "vitest";
import { handleSale } from "../../src/commands/sale.js";
import { InteractionResponseType } from "discord-interactions";

vi.mock("../../src/lib/supabase.js", () => {
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "test-uuid" },
        error: null,
      }),
    }),
  });
  return {
    default: {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    },
  };
});

function makeInteraction(quantity, total) {
  return {
    member: {
      user: { id: "123456", username: "TestUser" },
    },
    data: {
      options: [
        { name: "quantity", value: quantity },
        { name: "total", value: total },
      ],
    },
  };
}

describe("handleSale", () => {
  it("logs_a_sale_and_returns_confirmation", async () => {
    const interaction = makeInteraction(5000, 3750000);
    const result = await handleSale(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.content).toContain("Dried Kelp Blocks");
    expect(result.data.content).toContain("5,000");
    expect(result.data.content).toContain("3,750,000");
    expect(result.data.content).toContain("TestUser");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/commands/sale.test.js
```

Expected: FAIL

**Step 3: Implement /sale handler**

```javascript
import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";

export async function handleSale(interaction) {
  const user = interaction.member.user;
  const options = interaction.data.options;

  const quantity = options.find((o) => o.name === "quantity").value;
  const totalRevenue = options.find((o) => o.name === "total").value;

  const { error } = await supabase.from("sales").insert({
    discord_user_id: user.id,
    discord_username: user.username,
    quantity,
    total_revenue: totalRevenue,
  });

  if (error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Failed to log sale: ${error.message}` },
    };
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Logged sale of ${formatNumber(quantity)} Dried Kelp Blocks for $${formatNumber(totalRevenue)} by ${user.username}`,
    },
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/commands/sale.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/sale.js tests/commands/sale.test.js
git commit -m "feat: add /sale command with tests"
```

---

### Task 7: /balance Command

**Files:**
- Create: `src/commands/balance.js`
- Create: `tests/commands/balance.test.js`

**Step 1: Write the test**

```javascript
import { describe, it, expect, vi } from "vitest";
import { handleBalance } from "../../src/commands/balance.js";
import { InteractionResponseType } from "discord-interactions";

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "expenses") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [
              { discord_user_id: "1", discord_username: "David", total_cost: 10000000 },
              { discord_user_id: "2", discord_username: "Alex", total_cost: 3000000 },
              { discord_user_id: "1", discord_username: "David", total_cost: 2000000 },
            ],
            error: null,
          }),
        }),
      };
    }
    if (table === "sales") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [
              { total_revenue: 20000000 },
            ],
            error: null,
          }),
        }),
      };
    }
  });
  return { default: { from: fromMock } };
});

describe("handleBalance", () => {
  it("shows_proportional_breakdown", async () => {
    const interaction = { member: { user: { id: "1" } } };
    const result = await handleBalance(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const content = result.data.content;
    expect(content).toContain("15,000,000"); // total expenses
    expect(content).toContain("20,000,000"); // total revenue
    expect(content).toContain("5,000,000");  // profit
    expect(content).toContain("David");
    expect(content).toContain("Alex");
  });

  it("handles_no_expenses", async () => {
    // Re-mock for empty state
    const { default: supabase } = await import("../../src/lib/supabase.js");
    supabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));

    const interaction = { member: { user: { id: "1" } } };
    const result = await handleBalance(interaction);

    expect(result.data.content).toContain("No expenses");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/commands/balance.test.js
```

Expected: FAIL

**Step 3: Implement /balance handler**

```javascript
import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";

export async function handleBalance(interaction) {
  // Fetch unsettled expenses and sales
  const [expensesResult, salesResult] = await Promise.all([
    supabase.from("expenses").select("discord_user_id, discord_username, total_cost").is("payout_id", null),
    supabase.from("sales").select("total_revenue").is("payout_id", null),
  ]);

  if (expensesResult.error || salesResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Failed to fetch balance data." },
    };
  }

  const expenses = expensesResult.data;
  const sales = salesResult.data;

  if (expenses.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "No expenses logged in the current cycle." },
    };
  }

  // Aggregate per player
  const playerTotals = {};
  let totalExpenses = 0;

  for (const e of expenses) {
    const cost = Number(e.total_cost);
    totalExpenses += cost;
    if (!playerTotals[e.discord_user_id]) {
      playerTotals[e.discord_user_id] = { username: e.discord_username, invested: 0 };
    }
    playerTotals[e.discord_user_id].invested += cost;
  }

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_revenue), 0);
  const totalProfit = totalRevenue - totalExpenses;

  // Build breakdown
  let lines = [
    `**Current Cycle**`,
    `Total Expenses: $${formatNumber(totalExpenses)}`,
    `Total Revenue: $${formatNumber(totalRevenue)}`,
    `Profit: $${formatNumber(totalProfit)}`,
    ``,
    `| Player | Invested | Share | Payout |`,
    `|--------|----------|-------|--------|`,
  ];

  for (const [, player] of Object.entries(playerTotals)) {
    const share = player.invested / totalExpenses;
    const payout = player.invested + totalProfit * share;
    lines.push(
      `| ${player.username} | $${formatNumber(player.invested)} | ${(share * 100).toFixed(1)}% | $${formatNumber(Math.round(payout))} |`,
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: lines.join("\n") },
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/commands/balance.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/balance.js tests/commands/balance.test.js
git commit -m "feat: add /balance command with proportional breakdown"
```

---

### Task 8: /payout Command

**Files:**
- Create: `src/commands/payout.js`
- Create: `tests/commands/payout.test.js`

**Step 1: Write the test**

```javascript
import { describe, it, expect, vi } from "vitest";
import { handlePayout } from "../../src/commands/payout.js";
import { InteractionResponseType } from "discord-interactions";

const mockUpdate = vi.fn().mockReturnValue({
  is: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "expenses") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [
              { discord_user_id: "1", discord_username: "David", total_cost: 10000000 },
              { discord_user_id: "2", discord_username: "Alex", total_cost: 5000000 },
            ],
            error: null,
          }),
        }),
        update: mockUpdate,
      };
    }
    if (table === "sales") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [{ total_revenue: 20000000 }],
            error: null,
          }),
        }),
        update: mockUpdate,
      };
    }
    if (table === "payouts") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "payout-uuid" },
              error: null,
            }),
          }),
        }),
      };
    }
  });
  return { default: { from: fromMock } };
});

describe("handlePayout", () => {
  it("settles_cycle_and_shows_breakdown", async () => {
    const interaction = { member: { user: { id: "1" } } };
    const result = await handlePayout(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const content = result.data.content;
    expect(content).toContain("Payout");
    expect(content).toContain("David");
    expect(content).toContain("Alex");
    expect(content).toContain("15,000,000"); // total expenses
    expect(content).toContain("20,000,000"); // total revenue
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/commands/payout.test.js
```

Expected: FAIL

**Step 3: Implement /payout handler**

```javascript
import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";

export async function handlePayout(interaction) {
  // Fetch unsettled expenses and sales
  const [expensesResult, salesResult] = await Promise.all([
    supabase.from("expenses").select("discord_user_id, discord_username, total_cost").is("payout_id", null),
    supabase.from("sales").select("total_revenue").is("payout_id", null),
  ]);

  if (expensesResult.error || salesResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Failed to fetch data for payout." },
    };
  }

  const expenses = expensesResult.data;
  const sales = salesResult.data;

  if (expenses.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "No expenses to settle in the current cycle." },
    };
  }

  // Aggregate per player
  const playerTotals = {};
  let totalExpenses = 0;

  for (const e of expenses) {
    const cost = Number(e.total_cost);
    totalExpenses += cost;
    if (!playerTotals[e.discord_user_id]) {
      playerTotals[e.discord_user_id] = { username: e.discord_username, invested: 0 };
    }
    playerTotals[e.discord_user_id].invested += cost;
  }

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_revenue), 0);
  const totalProfit = totalRevenue - totalExpenses;

  // Build breakdown for storage
  const breakdown = Object.entries(playerTotals).map(([userId, player]) => {
    const share = player.invested / totalExpenses;
    const payout = player.invested + totalProfit * share;
    return {
      discord_user_id: userId,
      username: player.username,
      invested: player.invested,
      share: share,
      payout: Math.round(payout),
    };
  });

  // Create payout record
  const { data: payoutRecord, error: payoutError } = await supabase
    .from("payouts")
    .insert({
      total_expenses: totalExpenses,
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      breakdown: breakdown,
    })
    .select()
    .single();

  if (payoutError) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Failed to create payout: ${payoutError.message}` },
    };
  }

  // Mark expenses and sales as settled
  await Promise.all([
    supabase.from("expenses").update({ payout_id: payoutRecord.id }).is("payout_id", null),
    supabase.from("sales").update({ payout_id: payoutRecord.id }).is("payout_id", null),
  ]);

  // Build response
  let lines = [
    `**Payout Settled**`,
    `Total Expenses: $${formatNumber(totalExpenses)}`,
    `Total Revenue: $${formatNumber(totalRevenue)}`,
    `Profit: $${formatNumber(totalProfit)}`,
    ``,
    `| Player | Invested | Share | Payout |`,
    `|--------|----------|-------|--------|`,
  ];

  for (const entry of breakdown) {
    lines.push(
      `| ${entry.username} | $${formatNumber(entry.invested)} | ${(entry.share * 100).toFixed(1)}% | $${formatNumber(entry.payout)} |`,
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: lines.join("\n") },
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/commands/payout.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/payout.js tests/commands/payout.test.js
git commit -m "feat: add /payout command with cycle settlement"
```

---

### Task 9: Slash Command Registration Script

**Files:**
- Create: `src/register.js`

**Step 1: Create the registration script**

This is a one-time script run locally to register slash commands with Discord's API.

```javascript
import "dotenv/config";

const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  {
    name: "expense",
    description: "Log a supply purchase for the kelp farm",
    options: [
      {
        name: "item",
        description: "What you bought",
        type: 3, // STRING
        required: true,
        choices: [
          { name: "Bone Blocks", value: "Bone Blocks" },
          { name: "Bones", value: "Bones" },
          { name: "Blaze Rods", value: "Blaze Rods" },
          { name: "Chests", value: "Chests" },
          { name: "Shulker Shells", value: "Shulker Shells" },
          { name: "Shulkers", value: "Shulkers" },
        ],
      },
      {
        name: "quantity",
        description: "How many you bought",
        type: 4, // INTEGER
        required: true,
      },
      {
        name: "total",
        description: "Total amount spent",
        type: 10, // NUMBER (decimal)
        required: true,
      },
    ],
  },
  {
    name: "sale",
    description: "Log a Dried Kelp Block sale",
    options: [
      {
        name: "quantity",
        description: "How many Dried Kelp Blocks sold",
        type: 4, // INTEGER
        required: true,
      },
      {
        name: "total",
        description: "Total amount earned",
        type: 10, // NUMBER (decimal)
        required: true,
      },
    ],
  },
  {
    name: "balance",
    description: "View current cycle expenses, revenue, and profit breakdown",
  },
  {
    name: "payout",
    description: "Settle the current cycle and calculate who gets what",
  },
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to register commands: ${response.status} ${text}`);
    process.exit(1);
  }

  console.log("Commands registered successfully!");
  const data = await response.json();
  console.log(`Registered ${data.length} commands.`);
}

registerCommands();
```

**Step 2: Install dotenv and add register script to package.json**

```bash
npm install dotenv
```

Add to `package.json` scripts:
```json
"register": "node src/register.js"
```

**Step 3: Commit**

```bash
git add src/register.js package.json package-lock.json
git commit -m "feat: add slash command registration script"
```

---

### Task 10: README and Deployment Setup

**Files:**
- Create: `README.md`

**Step 1: Create README**

```markdown
# Kelp Team Discord Bot

A Discord bot for tracking shared expenses and profits from DonutSMP kelp farm operations.

## Setup

### 1. Create Discord Application

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Under "Bot", create a bot and copy the token
4. Under "General Information", copy the Application ID and Public Key
5. Under "OAuth2 > URL Generator", select `bot` and `applications.commands` scopes
6. Use the generated URL to invite the bot to your server

### 2. Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```
DISCORD_APPLICATION_ID=your_app_id
DISCORD_PUBLIC_KEY=your_public_key
DISCORD_BOT_TOKEN=your_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Register Slash Commands

```bash
npm install
npm run register
```

### 5. Deploy to Vercel

```bash
npx vercel
```

Set the environment variables in Vercel dashboard (Settings > Environment Variables).

### 6. Set Discord Interactions Endpoint

In your Discord application settings, set the "Interactions Endpoint URL" to:

```
https://your-vercel-app.vercel.app/interactions
```

## Commands

- `/expense item:<dropdown> quantity:<number> total:<number>` — Log a supply purchase
- `/sale quantity:<number> total:<number>` — Log a Dried Kelp Block sale
- `/balance` — View current cycle breakdown
- `/payout` — Settle the current cycle
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions"
```

---

### Task 11: Run All Tests and Final Verification

**Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 2: Verify project structure**

```bash
ls -R api/ src/ tests/
```

Expected output should match the design doc structure.

**Step 3: Final commit (if any fixes needed)**

```bash
git log --oneline
```

Verify all commits are clean and incremental.
