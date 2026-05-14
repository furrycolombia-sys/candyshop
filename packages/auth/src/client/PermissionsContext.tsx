"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

interface PermissionsContextValue {
  initialGrantedKeys: string[];
}

const PermissionsContext = createContext<PermissionsContextValue>({
  initialGrantedKeys: [],
});

export function PermissionsProvider({
  initialGrantedKeys,
  children,
}: {
  initialGrantedKeys: string[];
  children: ReactNode;
}) {
  const value = useMemo(() => ({ initialGrantedKeys }), [initialGrantedKeys]);
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function useInitialGrantedKeys(): string[] {
  return useContext(PermissionsContext).initialGrantedKeys;
}
