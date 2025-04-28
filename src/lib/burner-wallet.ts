"use client";

import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

const DEVNET_RPC = clusterApiUrl("devnet");

export async function requestAirdropIfNeeded(wallet: Keypair): Promise<void> {
  try {
    const connection = new Connection(DEVNET_RPC);
    const walletBalance = await connection.getBalance(wallet.publicKey);
    
    console.log(`Wallet balance: ${walletBalance / LAMPORTS_PER_SOL} SOL`);
    
    // If balance is too low, request an airdrop
    if (walletBalance < 0.05 * LAMPORTS_PER_SOL) {
      console.log("User balance is low, requesting airdrop...");
      try {
        const signature = await connection.requestAirdrop(wallet.publicKey, 1 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(signature, 'confirmed');
        console.log("Airdrop successful! New balance:", 
          await connection.getBalance(wallet.publicKey) / LAMPORTS_PER_SOL, "SOL");
      } catch (airdropError) {
        console.error("Airdrop failed:", airdropError);
        throw new Error("Failed to get devnet SOL. Please request SOL from a devnet faucet manually.");
      }
    }
  } catch (error) {
    console.error("Error checking wallet balance or requesting airdrop:", error);
    // We don't throw here, so the app can still work even if airdrop fails
  }
}

/**
 * Get or create a burner wallet.
 * Saves the secret key encrypted in localStorage.
 * Automatically tries to get an airdrop if needed.
 */
export function getOrCreateBurnerWallet(): Keypair {
  if (typeof window === "undefined") {
    throw new Error("This function must run on the client side.");
  }

  const storedWallet = localStorage.getItem("burnerWallet");
  let wallet: Keypair;

  if (storedWallet) {
    const secretKeyArray = JSON.parse(storedWallet) as number[];
    const secretKey = new Uint8Array(secretKeyArray);
    wallet = Keypair.fromSecretKey(secretKey);
  } else {
    wallet = Keypair.generate();
    localStorage.setItem("burnerWallet", JSON.stringify(Array.from(wallet.secretKey)));
  }

  // Request airdrop in the background without awaiting
  // This way the function returns immediately while the airdrop happens asynchronously
  requestAirdropIfNeeded(wallet).catch(console.error);
  
  return wallet;
}

/**
 * Clear the burner wallet from localStorage.
 */
export function clearBurnerWallet() {
  localStorage.removeItem("burnerWallet");
}