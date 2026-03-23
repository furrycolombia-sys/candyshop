"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

interface ErrorState {
  message: string | null;
  retry: (() => void) | null;
}

interface ErrorContextValue {
  error: ErrorState;
  setError: (message: string | null, retry?: () => void) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState<ErrorState>({
    message: null,
    retry: null,
  });

  const setError = useCallback((message: string | null, retry?: () => void) => {
    setErrorState({ message, retry: retry ?? null });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({ message: null, retry: null });
  }, []);

  const value = useMemo(
    () => ({ error, setError, clearError }),
    [error, setError, clearError],
  );

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
}

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorContext must be used within an ErrorProvider");
  }
  return context;
}
