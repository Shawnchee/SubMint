"use client";

import { useState } from "react";
import Image from "next/image";
import { useWallet } from "./wallet-provider";
import { mintSubscriptionNFT } from "@/lib/mint-subscription-nft";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import supabase from "@/lib/supabase/client";
import { Button } from "./ui/button";


export default function SubscriptionForm() {
  const wallet = useWallet();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [recurringDate, setRecurringDate] = useState("");
  const [proof, setProof] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<any>(null);
  const [mintAddress, setMintAddress] = useState("");
  const [error, setError] = useState("");
  
  // For now, let's use a static image for all NFTs
  const staticImageUri = "https://images.pexels.com/photos/218717/pexels-photo-218717.jpeg?auto=compress&cs=tinysrgb&w=600";

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Reset any previous errors
      setError("");
      
      // First, upload the image to Pinata
      const imageData = new FormData();
      
      // For now using a static image, but you could allow image uploads
      const imageResponse = await fetch(staticImageUri);
      const imageBlob = await imageResponse.blob();
      const imageFile = new File([imageBlob], "subscription-image.jpg", { type: "image/jpeg" });
      imageData.set("file", imageFile);
      
      const imageUploadResponse = await fetch("/api/files", {
        method: "POST",
        body: imageData,
      });
      
      const imageUri = await imageUploadResponse.json();
      
      // Then, create and upload the metadata
      const metadataResponse = await fetch("/api/metadata-to-pinata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: `${title}: ${price}/mo (${startDate} to ${endDate})`,
          imageUri,
          price,
          recurringDate,
          startDate,
          endDate,
          proof
        }),
      });
      
      if (!metadataResponse.ok) {
        throw new Error("Failed to upload metadata");
      }
      
      const { metadataUri } = await metadataResponse.json();
      
      const result = await mintSubscriptionNFT({
        wallet,
        title,
        description: `${title}: ${price}/mo (${startDate} to ${endDate})`,
        metadataUri: metadataUri, // Use the Pinata metadata URI instead of direct image
      });
      
      let signature = result.signature;
      let mintAddress = result.mintAddress;
  
      // Store the mint result in Supabase
      if (mintAddress) {
        try {
          // Get current auth session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Get current NFT addresses from user profile
            const { data: userData } = await supabase
              .from('user')
              .select('nft_address , metadata_uris' )
              .eq('id', session.user.id)
              .single();
            
            // Add the new NFT to the array
            const updatedNftAddresses = [...(userData?.nft_address || []), mintAddress];
            const updatedMetadataUris = [...(userData?.metadata_uris || []), metadataUri];

            
            // Update the user profile
            await supabase
              .from('user')
              .update({ 
                nft_address: updatedNftAddresses,
                metadata_uris: updatedMetadataUris,
                updated_at: new Date().toISOString()
              })
              .eq('id', session.user.id);
          }
        } catch (error) {
          console.error("Error updating user profile with NFT:", error);
          // Continue even if this fails
        }
      }

      setTxSignature(signature);
      setMintAddress(mintAddress);
    } catch (error: any) {
      console.error("Minting failed", error);
      setError(error.message || "Failed to mint NFT. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10">
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-indigo-800/20 to-cyan-900/20 rounded-2xl blur-xl -z-10"></div>
      
      <Card className="w-full max-w-3xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl rounded-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/10 via-cyan-800/10 to-slate-900/10 -z-10"></div>
        
        <CardHeader className="relative border-b border-white/10">
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-cyan-300">Create Subscription NFT</CardTitle>
          <CardDescription className="text-slate-300">Mint an NFT to track your subscription details</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="flex flex-row gap-8">
            {/* TODO: Add a dynamic image upload option */}
            {/* NFT Image Preview */}
            <div className="flex-shrink-0">
              <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-white/20 shadow-lg group transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-cyan-600/30 group-hover:opacity-70 transition-opacity"></div>
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
            
            {/* Form Fields */}
            <div className="flex-grow space-y-4 text-white">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Subscription Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-blue-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                required
                placeholder="Netflix, Spotify, etc."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Price (per month)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-blue-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                required
                placeholder="15.99"
              />
            </div>
            
            <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Start Date (dd/mm/yyyy)</label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-blue-400 focus:outline-none transition-colors text-white placeholder-slate-400"
              required
              placeholder="31/12/2023"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">End Date (dd/mm/yyyy)</label>
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-blue-400 focus:outline-none transition-colors text-white placeholder-slate-400"
              required
              placeholder="31/12/2024"
            />
          </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Payment Due Date (day of month)</label>
              <input
                value={recurringDate}
                onChange={(e) => setRecurringDate(e.target.value)}
                className="w-full p-2 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-blue-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                required
                placeholder="15"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Proof of Subscription</label>
              <input
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                className="w-full p-2 bg-slate-800/50 backdrop-blur-sm rounded-md border border-white/10 focus:border-blue-400 focus:outline-none transition-colors text-white placeholder-slate-400"
                placeholder="Link of Proof (Google Drive, Dropbox, etc.)"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-md p-4 text-red-200">
                <p>{error}</p>
                {error.includes("enough SOL") && (
                  <p className="mt-2">
                    You can get free devnet SOL from{" "}
                    <a 
                      href="https://faucet.solana.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline text-blue-300 hover:text-blue-200 transition-colors"
                    >
                      Solana Faucet
                    </a>
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-cyan-700 w-full p-3 rounded-md text-white font-medium hover:from-indigo-500 hover:to-cyan-600 transition-all duration-300 disabled:opacity-70 transform hover:-translate-y-1 shadow-lg cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Minting...</span>
                </div>
              ) : (
                "Mint Subscription NFT"
              )}
            </button>
            </div>
          </div>
        </CardContent>
        
        {txSignature && (
          <CardFooter className="flex flex-col">
            <div className="text-cyan-300 space-y-2 bg-cyan-900/20 backdrop-blur-sm border border-cyan-500/30 rounded-md p-4 w-full">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="font-medium">Success! Your subscription NFT has been created.</p>
              </div>
              <p>
                View Transaction on BlockChain: {" "}
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-300 hover:text-indigo-200 transition-colors underline"
                >
                  Click Here
                </a>
              </p>
              {mintAddress && (
                <p>
                  View NFT on BlockChain: {" "}
                  <a
                    href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-300 hover:text-indigo-200 transition-colors underline"
                  >
                    Click Here
                  </a>
                </p>
              )}
            <Button 
              variant="default"
              className="bg-gradient-to-r from-indigo-600 to-cyan-700 w-full p-3 rounded-md text-white font-medium hover:from-indigo-500 hover:to-cyan-600 transition-all duration-300 disabled:opacity-70 transform hover:-translate-y-1 shadow-lg mt-4 cursor-pointer"
              onClick={() => window.location.href = "/profile"}
            >
              View Profile
            </Button>

            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}