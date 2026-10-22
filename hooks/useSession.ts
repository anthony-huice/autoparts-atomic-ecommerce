import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function useSession() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Invalidamos la query para forzar el refetch cuando cambia la sesión (login/logout)
      queryClient.invalidateQueries({ queryKey: ['session'] })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient, supabase.auth])

  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        // En caso de error (ej. token expirado), devolvemos null
        return null
      }
      return user
    },
    // La sesión es válida hasta que el onAuthStateChange detecte un cambio
    staleTime: Infinity,
  })
}
