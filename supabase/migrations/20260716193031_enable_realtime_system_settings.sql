/*
# Enable Realtime for system_settings table

1. Changes
- Adds `public.system_settings` to the `supabase_realtime` publication so that
  postgres_changes subscriptions on the `system_settings` table actually fire.
- Without this, the realtime listener in the client never receives updates
  when the BCV rate is locked or manually approved.

2. Security
- No RLS changes. The existing SELECT policy (anon + authenticated) already
  allows all clients to read the rate. Realtime respects RLS, so clients
  can only receive changes for rows they are allowed to SELECT.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
