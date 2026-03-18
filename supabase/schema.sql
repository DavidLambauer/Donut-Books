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
