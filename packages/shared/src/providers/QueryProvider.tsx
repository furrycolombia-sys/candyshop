"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { environment } from "@shared/config/environment";
import { TIME_CONSTANTS } from "@shared/constants/time";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
