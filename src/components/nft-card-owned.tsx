"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
}

export default function NFTCard({ metadataUri }: { metadataUri: string }) {
  const [nftData, setNftData] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNFTData() {
      try {
        setLoading(true);
        
        console.log("Fetching metadata from URI:", metadataUri);
        
        // Fetch the metadata directly from the URI
        const response = await fetch(metadataUri);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.status}`);
        }
        
        // Parse the JSON metadata
        const metadataJson = await response.json();
        console.log("Metadata loaded:", metadataJson);
        
        setNftData(metadataJson);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching NFT data:', error);
        setError(error.message || "Failed to load NFT data");
        setNftData(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNFTData();
  }, [metadataUri]);

  if (loading) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-xl h-96 animate-pulse flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
      </div>
    );
  }

  if (error || !nftData) {
    return (
      <Card className="w-full bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl rounded-xl overflow-hidden h-full">
        <CardContent className="p-6 flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-800/40 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Error Loading NFT</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find the attribute values
  const price = nftData.attributes.find(attr => attr.trait_type === "Price")?.value || "Unknown";
  const startDate = nftData.attributes.find(attr => attr.trait_type === "Start Date")?.value || "Unknown";
  const endDate = nftData.attributes.find(attr => attr.trait_type === "End Date")?.value || "Unknown";
  const paymentDate = nftData.attributes.find(attr => attr.trait_type === "Payment Date")?.value || "Unknown";
  const proof = nftData.attributes.find(attr => attr.trait_type === "Proof")?.value || "N/A";

  return (
    <Card className="w-full bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl rounded-xl overflow-hidden h-full transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-2xl">
      <div className="relative h-48 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-cyan-600/30 z-10"></div>
        <Image 
          src={nftData.image} 
          alt={nftData.name}
          fill
          className="object-cover"
        />
      </div>
      
      <CardHeader className="relative border-b border-white/10 pb-2">
        <CardTitle className="text-xl font-bold text-white">{nftData.name}</CardTitle>
        <CardDescription className="text-slate-300">Subscription NFT</CardDescription>
        <div className="absolute top-4 right-4 bg-indigo-600/80 text-white text-xs font-bold px-2 py-1 rounded-full">
          Active
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 pb-2 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Price</span>
          <span className="font-medium text-white">${price}/month</span>
        </div>
        
        <div className="flex justify-between items-center">
  <span className="text-sm text-slate-400">Start Date</span>
  <span className="font-medium text-white">{startDate}</span>
</div>

<div className="flex justify-between items-center">
  <span className="text-sm text-slate-400">End Date</span>
  <span className="font-medium text-white">{endDate}</span>
</div>

<div className="flex justify-between items-center">
  <span className="text-sm text-slate-400">Billing Due Date Monthly</span>
  <span className="font-medium text-white">{paymentDate}</span>
</div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Proof</span>
          <span className="font-mono text-xs text-indigo-300 truncate max-w-[150px]">{proof}</span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">

        <Link
    href={`/profile/${encodeURIComponent(metadataUri)}`}
    className="w-full text-center bg-indigo-600/70 hover:bg-indigo-600/90 text-white py-2 px-4 rounded-md text-sm transition-colors"
    >
    Manage Subscription
        </Link>
        
      </CardFooter>
    </Card>
  );
}