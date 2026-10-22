'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'

const ReactQueryDevtools = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@tanstack/react-query-devtools').then(m => m.ReactQueryDevtools), { ssr: false })
  : () => null;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Con SSR usualmente queremos un staleTime arriba de 0 para
        // evitar refetching inmediato en el cliente.
        staleTime: 60 * 1000,
        // Deshabilita el refetch automático al recuperar el foco de la ventana.
        // Por defecto está activado, lo que causa re-renders excesivos en
        // localhost (Next.js recompila en cada petición) y es innecesario
        // en producción para datos que no cambian en tiempo real.
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // El Server siempre hace un nuevo query client
    return makeQueryClient()
  } else {
    // El Browser crea el client solo si no existe, evadiendo pérdida en HMR
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
