# Kelp Farm Discord Bot — Design Document

## Overview

A Discord bot for tracking shared expenses and profits from a DonutSMP Minecraft kelp farm operation run by 5 players. The bot handles expense logging, sale logging, balance checking, and proportional profit payouts.

## Stack

- **Compute:** Vercel (serverless functions)
- **Database:** Supabase (Postgres)
- **Bot type:** Discord Interactions Endpoint (HTTP webhooks, no gateway connection)
- **Cost:** $0 (free tiers only)

## Architecture

```
Discord Slash Command
        |
  HTTP POST to Vercel
        |
  /api/interactions.js  (single serverless function)
        |
  Validates request -> Routes to command handler -> Queries Supabase -> Returns response
        |
  Discord shows result
```

Discord sends HTTP POST requests to a single Vercel endpoint when users invoke slash commands. The endpoint verifies the request signature, routes to the appropriate command handler, and returns a response. No persistent connection or always-on server needed.

## Database Schema

### expenses

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| discord_user_id | text | Who logged it |
| discord_username | text | Display name |
| item | text | One of: Bone Blocks, Bones, Blaze Rods, Chests, Shulker Shells, Shulkers |
| quantity | integer | How many |
| total_cost | decimal | Total amount spent |
| payout_id | uuid (FK, nullable) | Links to payout when settled |
| created_at | timestamp | When logged |

### sales

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| discord_user_id | text | Who logged it |
| discord_username | text | Display name |
| quantity | integer | How many Dried Kelp Blocks |
| total_revenue | decimal | Total earned |
| payout_id | uuid (FK, nullable) | Links to payout when settled |
| created_at | timestamp | When logged |

### payouts

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| settled_at | timestamp | When payout was calculated |
| total_expenses | decimal | Sum of all expenses in this cycle |
| total_revenue | decimal | Sum of all sales in this cycle |
| total_profit | decimal | Revenue minus expenses |
| breakdown | jsonb | Per-person: invested, share %, net owed |

## Slash Commands

### /expense item:\<dropdown\> quantity:\<number\> total:\<number\>

Logs a supply purchase. Item is a fixed dropdown: Bone Blocks, Bones, Blaze Rods, Chests, Shulker Shells, Shulkers.

Response: "Logged 300,000 Bone Blocks for $10,000,000 ($33.33/ea) by @David"

### /sale quantity:\<number\> total:\<number\>

Logs a Dried Kelp Block sale (hardcoded item).

Response: "Logged sale of 5,000 Dried Kelp Blocks for $3,750,000 by @David"

### /balance

Shows current unsettled cycle standing: total expenses, total revenue, profit, and per-person breakdown with investment share percentages and projected payouts.

### /payout

Settles the current cycle. Calculates proportional split, saves snapshot to payouts table, marks all unsettled expenses/sales with the payout_id. Displays who gets what.

## Payout Calculation

1. Total Expenses = sum of all unsettled expenses
2. Total Revenue = sum of all unsettled sales
3. Profit = Total Revenue - Total Expenses
4. Each person's share % = their expenses / Total Expenses
5. Each person's payout = their expenses + (Profit * their share %)
6. If profit is negative (loss), the loss is split proportionally the same way

## Project Structure

```
kelp-team-discord-bot/
  api/
    interactions.js        # Single Vercel serverless function
  src/
    commands/
      expense.js           # /expense handler
      sale.js              # /sale handler
      balance.js           # /balance handler
      payout.js            # /payout handler
    lib/
      supabase.js          # Supabase client init
      discord.js           # Request verification + response helpers
    register.js            # One-time script to register slash commands with Discord
  package.json
  vercel.json
  .env.example
  README.md
```

## Item Lists

### Expense Items (fixed dropdown)
- Bone Blocks
- Bones
- Blaze Rods
- Chests
- Shulker Shells
- Shulkers

### Sale Items
- Dried Kelp Blocks (hardcoded, no dropdown needed)
