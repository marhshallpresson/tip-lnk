import { createClient } from '@supabase/supabase-js'

/**
 * Professional Supabase Frontend Client (Anon Only)
 * All privileged operations must go through /api/* server routes.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default supabase
