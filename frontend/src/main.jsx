import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles.css';

/**
 * React Query owns all server state (doctors, slots, appointments, patient
 * search results): caching, de-duping concurrent requests for the same
 * key, background refetch, and cache invalidation on mutation. This is
 * why there's no separate "appointments" slice in the Zustand store - it
 * would just be a second, harder-to-keep-correct copy of this cache.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
