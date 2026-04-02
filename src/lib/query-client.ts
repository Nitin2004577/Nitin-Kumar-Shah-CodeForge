import { QueryClient } from "@tanstack/react-query";

// Singleton QueryClient — shared across the app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 30 seconds before background refetch
      staleTime: 30 * 1000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on window focus in an IDE — too disruptive
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
