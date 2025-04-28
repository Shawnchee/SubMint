"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { getOrCreateBurnerWallet } from "@/lib/burner-wallet";

const WalletContext = createContext<Keypair | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Keypair | null>(null);

  useEffect(() => {
    const wallet = getOrCreateBurnerWallet();
    setWallet(wallet);
  }, []);

  if (!wallet) {
    return <div className="text-center text-gray-400 mt-10">Loading wallet...</div>;
  }

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
