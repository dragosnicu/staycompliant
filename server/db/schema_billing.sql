-- ============================================================
-- RentPermit — Stage 3 Billing Migration
-- Run this ONCE in your database (Supabase SQL editor or Railway query tool)
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status    VARCHAR(50)  DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '14 days');

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id     ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);

-- Update existing users to have a trial that starts now
-- (they already used the app, give them 14 days from today)
UPDATE users
SET trial_ends_at = (NOW() + INTERVAL '14 days')
WHERE trial_ends_at IS NULL;
