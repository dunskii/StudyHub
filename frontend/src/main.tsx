import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ui/ErrorBoundary/ErrorBoundary'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Error handler for logging to external service (e.g., Sentry)
const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
  // Log to console in development
  console.error('Application error:', error)
  console.error('Error info:', errorInfo)

  // In production, send to error tracking service
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
  // }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary onError={handleError}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
