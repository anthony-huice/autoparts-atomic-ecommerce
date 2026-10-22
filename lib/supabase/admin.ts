import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con Service Role Key.
 * ⚠️  BYPASEA ROW LEVEL SECURITY.
 * Solo usar en Server Actions o API Routes, DESPUÉS de verificar
 * manualmente que el usuario tiene los permisos necesarios.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
