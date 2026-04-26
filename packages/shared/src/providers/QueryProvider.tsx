"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { environment } from "@shared/config/environment";
import { TIME_CONSTANTS } from "@shared/constants/time";

interface QueryProviderProps {
  children: ReactNode;
  onQueryError?: (error: unknown) => void;
}

export function QueryProvider({ children, onQueryError }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({ onError: onQueryError }),
        queryCache: new QueryCache({ onError: onQueryError }),
        defaultOptions: {
          queries: {
            staleTime: TIME_CONSTANTS.QUERY.STALE_TIME_MS,
            gcTime: TIME_CONSTANTS.QUERY.GC_TIME_MS,
            retry: 1,
            refetchOnWindowFocus: environment.isProduction,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
