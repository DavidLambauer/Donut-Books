# DonutBooks

Track shared expenses, sales, and profits for your DonutSMP farms. Log what you spend, record what you sell, and let DonutBooks calculate fair payouts based on everyone's investment.

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
