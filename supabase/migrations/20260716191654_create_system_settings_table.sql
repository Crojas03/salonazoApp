/*
# Create system_settings table for BCV rate consensus engine

1. New Tables
- `system_settings` — key/value store for system-wide configuration.
  - `key` (text, primary key) — setting name (e.g. 'bcv_rate')
  - `value` (jsonb, not null) — structured setting data
  - `updated_at` (timestamptz, auto-updated)

  The BCV rate row (key='bcv_rate') stores:
  - rate (numeric): the locked exchange rate
  - rate_date (text): YYYY-MM-DD this rate applies to
  - status ('locked' | 'pending_approval' | 'manual'): how the rate was set
  - consensus_count (int): how many sources agreed
  - sources (jsonb): { sourceName: rate | null } per API
  - matching_sources (text[]): which sources formed the consensus
  - alert_active (bool): discrepancy flag
  - approved_by (text | null): who manually approved
  - last_verified_at (timestamptz): last consensus run

2. Security
- RLS enabled on system_settings.
- SELECT policy for anon+authenticated: the app reads the rate to display Bs. prices.
- All writes (INSERT/UPDATE/DELETE) go through the bcv-consensus edge function
  using the service role key, which bypasses RLS. No frontend write policies needed.

3. Initial Data
- Inserts a default bcv_rate row with a fallback rate of 145.50 and status 'pending_approval'.
*/

CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only SELECT is needed by the frontend; all writes go through the edge function (service role).
DROP POLICY IF EXISTS "read_system_settings" ON system_settings;
CREATE POLICY "read_system_settings"
ON system_settings FOR SELECT
TO anon, authenticated USING (true);

-- Insert default BCV rate row
INSERT INTO system_settings (key, value, updated_at)
VALUES (
  'bcv_rate',
  jsonb_build_object(
    'rate', 145.50,
    'rate_date', to_char((now() at time zone 'America/Caracas')::date, 'YYYY-MM-DD'),
    'status', 'pending_approval',
    'consensus_count', 0,
    'sources', '{}'::jsonb,
    'matching_sources', '[]'::jsonb,
    'alert_active', true,
    'approved_by', null,
    'last_verified_at', null
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;
