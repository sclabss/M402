import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  // Fail loudly on boot rather than surfacing a confusing error on the first
  // request. Copy .env.example to .env and fill these in.
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
