/*
# Create profiles table for hybrid security model

## Summary
Creates a `profiles` table to store customer and operator account data
with a hybrid security model: phone + 4-digit PIN for customers, and
email + password for operators.

## New Tables
- `profiles`
  - `id` (uuid, PK, default gen_random_uuid())
  - `phone` (text, UNIQUE, NOT NULL) — customer phone number (format: 04XX-XXXXXXX)
  - `name` (text, NOT NULL) — customer display name
  - `pin_hash` (text, NOT NULL) — SHA-256 hash of 4-digit PIN (salted with phone)
  - `email` (text, UNIQUE, nullable) — operator email for high-security auth
  - `password_hash` (text, nullable) — SHA-256 hash of operator password (salted with email)
  - `zone_id` (text, nullable) — preferred delivery zone
  - `address` (text, nullable) — default delivery address
  - `birthday` (text, nullable) — birthday for promotions
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Security
- RLS enabled on `profiles`.
- NO anon policies — all read/write access goes through the `auth-verify`
  edge function which uses the service role key to bypass RLS.
- This prevents PIN hashes and password hashes from being exposed to the client.

## Important Notes
1. Customer auth: phone + 4-digit PIN (verified via edge function)
2. Operator auth: email + password (verified via edge function)
3. The edge function uses the service role key to read/write profiles
4. PIN is hashed with SHA-256 + phone as salt
5. Password is hashed with SHA-256 + email as salt
6. Operator status is determined by checking the `staff_roles` table
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  pin_hash text NOT NULL,
  email text UNIQUE,
  password_hash text,
  zone_id text,
  address text,
  birthday text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- No policies: anon cannot read or write profiles directly.
-- All access is through the auth-verify edge function (service role key).

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
