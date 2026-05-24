import type { ReactNode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { store } from '@/shared/lib/store'
import { queryClient } from '@/shared/lib/queryClient'

type ProvidersProps = { children: ReactNode }

export function Providers({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ReduxProvider>
  )
}
