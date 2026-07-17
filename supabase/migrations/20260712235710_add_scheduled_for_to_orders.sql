-- Add scheduled_for column to orders for programmed deliveries
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
