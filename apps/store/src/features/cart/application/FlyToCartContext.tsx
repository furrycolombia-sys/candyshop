"use client";

import { createContext, useContext } from "react";

import { useFlyToCart } from "./useFlyToCart";

type FlyToCartContextValue = ReturnType<typeof useFlyToCart>;

const FlyToCartContext = createContext<FlyToCartContextValue | null>(null);

export function FlyToCartProvider({ children }: { children: React.ReactNode }) {
  const value = useFlyToCart();

  return (
    <FlyToCartContext.Provider value={value}>
      {children}
    </FlyToCartContext.Provider>
  );
}

export function useFlyToCartContext(): FlyToCartContextValue | null {
  return useContext(FlyToCartContext);
}
