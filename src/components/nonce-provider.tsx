"use client";

import { createContext, useContext } from "react";

const NonceContext = createContext<string | undefined>(undefined);

export function NonceProvider({ nonce, children }: { nonce?: string; children: React.ReactNode }) {
  return <NonceContext value={nonce}>{children}</NonceContext>;
}

export function useNonce() {
  return useContext(NonceContext);
}
