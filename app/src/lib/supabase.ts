import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabase = Boolean(URL && KEY)

/**
 * Cliente Supabase. Se env n\u00e3o estiver configurado, exporta null \u2014
 * UI deve detectar `hasSupabase` antes de chamar auth/online.
 */
export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(URL as string, KEY as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null
