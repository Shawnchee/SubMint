"use client";

import { useState } from "react";
import Image from "next/image";
import { useWallet } from "./wallet-provider";
import { mintSubscriptionNFT } from "@/lib/mint-subscription-nft";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscriptionForm() {
  const wallet = useWallet();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [recurringDate, setRecurringDate] = useState("");
  const [proof, setProof] = useState("");
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<any>("");
  const [mintAddress, setMintAddress] = useState("");
  const [error, setError] = useState("");
  
  // For now, let's use a static image for all NFTs
  const staticImageUri = "https://images.pexels.com/photos/218717/pexels-photo-218717.jpeg?auto=compress&cs=tinysrgb&w=600";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Reset any previous errors
      setError("");
      
      // Instead of using a data URI with embedded metadata, use a direct image URL
      // This avoids the "URI too long" error
      const { signature, mintAddress } = await mintSubscriptionNFT({
        wallet,
        title,
        // Keep description short to avoid URI length issues
        description: `${title}: ${price}/mo for ${duration}mo`,
        imageUri: staticImageUri,
      });

      setTxSignature(signature);
      setMintAddress(mintAddress);
    } catch (error:any) {
      console.error("Minting failed", error);
      setError(error.message || "Failed to mint NFT. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-slate-900/70 backdrop-blur-sm border border-slate-800 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Create Subscription NFT</CardTitle>
        <CardDescription>Mint an NFT to track your subscription details</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* NFT Image Preview */}
        <div className="mb-6 flex justify-center">
          <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-slate-700">
            <Image 
              src={staticImageUri}
              alt="Subscription NFT Image"
              width={160}
              height={160}
              className="object-cover"
              priority
            />
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-white">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subscription Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 bg-slate-800/80 rounded border border-slate-700 focus:border-primary focus:outline-none"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Price (per month)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-2 bg-slate-800/80 rounded border border-slate-700 focus:border-primary focus:outline-none"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration (months)</label>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full p-2 bg-slate-800/80 rounded border border-slate-700 focus:border-primary focus:outline-none"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Recurring Payment Date</label>
            <input
              value={recurringDate}
              onChange={(e) => setRecurringDate(e.target.value)}
              className="w-full p-2 bg-slate-800/80 rounded border border-slate-700 focus:border-primary focus:outline-none"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Proof of Subscription (optional)</label>
            <input
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              className="w-full p-2 bg-slate-800/80 rounded border border-slate-700 focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded p-4 text-red-200">
              <p>{error}</p>
              {error.includes("enough SOL") && (
                <p className="mt-2">
                  You can get free devnet SOL from{" "}
                  <a 
                    href="https://faucet.solana.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Solana Faucet
                  </a>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-primary w-full p-3 rounded text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {loading ? "Minting..." : "Mint Subscription NFT"}
          </button>
        </form>
      </CardContent>
      
      {txSignature && (
        <CardFooter className="flex flex-col">
          <div className="text-green-400 space-y-2 bg-green-900/30 border border-green-500/30 rounded-md p-4 w-full">
            <p className="font-medium">Success! Your subscription NFT has been created.</p>
            <p>
              View Transaction: {" "}
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank" 
                rel="noopener noreferrer"
                className="underline"
              >
                Solana Explorer
              </a>
            </p>
            {mintAddress && (
              <p>
                View NFT: {" "}
                <a
                  href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Solana Explorer
                </a>
              </p>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}