"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase/client';
import { clearBurnerWallet, getOrCreateBurnerWallet } from '@/lib/burner-wallet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/check-auth';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState<string[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [resetWalletLoading, setResetWalletLoading] = useState(false);
  const { user: authUser, loading: authloading } = useAuth();

  useEffect(() => {
    async function fetchUserProfile() {
      if (!authUser) return;

      try {
        setLoading(true);
        
        // Get current auth session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/authentication');
          return;
        }
        
        // Get user data from your custom table
        const { data: userData, error } = await supabase
          .from('user')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) throw error;
        
        // Get wallet address
        const burnerWallet = getOrCreateBurnerWallet();
        setWalletAddress(burnerWallet.publicKey.toString());
        
        // Set user data and NFTs
        setUser(userData);
        setNfts(userData.nft_address || []);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserProfile();
  }, [authUser]);

  const handleResetWallet = async () => {
    try {
      setResetWalletLoading(true);
      
      // Clear the wallet from localStorage
      clearBurnerWallet();
      
      // Generate a new wallet
      const newWallet = getOrCreateBurnerWallet();
      setWalletAddress(newWallet.publicKey.toString());
      
      // Update user record with new wallet address
      if (user) {
        await supabase
          .from('user')
          .update({ 
            burner_wallet_address: newWallet.publicKey.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
      
      alert('Wallet has been reset successfully!');
    } catch (error) {
      console.error('Error resetting wallet:', error);
      alert('Failed to reset wallet. Please try again.');
    } finally {
      setResetWalletLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/authentication');
  };

  if (authloading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
          <div className="mt-4 text-white text-lg">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Profile Header Section */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-800/30 to-cyan-800/30 rounded-xl blur-xl -z-10"></div>
          
          <Card className="w-full bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl rounded-xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                {/* Profile Picture */}
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 shadow-lg group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-cyan-600/30 group-hover:opacity-70 transition-opacity"></div>
                  {/* <Image 
                    src={user?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(user?.name || 'User')}
                    alt="Profile"
                    fill
                    className="object-cover"
                  /> */}
                </div>
                
                {/* User Info */}
                <div className="flex-grow space-y-4 text-center md:text-left">
                  <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                      {user?.name || 'User'}
                    </h1>
                    <p className="text-slate-400">{user?.email_address}</p>
                  </div>
                  
                  {/* Wallet Section */}
                  <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Temporary Wallet Address</h3>
                        <p className="text-xs sm:text-sm text-indigo-300 font-mono overflow-hidden text-ellipsis">
                          {walletAddress}
                        </p>
                      </div>
                      <button
                        onClick={handleResetWallet}
                        disabled={resetWalletLoading}
                        className="bg-red-600/70 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm flex items-center space-x-1 transition-colors whitespace-nowrap"
                      >
                        {resetWalletLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Resetting...</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            <span>Reset Wallet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Actions Buttons */}
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <button
                      onClick={() => router.push('/')}
                      className="bg-gradient-to-r from-indigo-600 to-cyan-700 hover:from-indigo-500 hover:to-cyan-600 text-white py-2 px-6 rounded-md transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
                    >
                      Create NFT
                    </button>
                    <button
                      onClick={handleLogout}
                      className="bg-slate-700/70 hover:bg-slate-600 text-white py-2 px-6 rounded-md transition-all duration-300"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* NFT Collection Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 mb-6">
            Your Subscription NFTs
          </h2>
          
          {nfts.length === 0 ? (
            <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/70 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No NFTs Yet</h3>
              <p className="text-slate-400 mb-6">You haven't created any subscription NFTs yet.</p>
              <button
                onClick={() => router.push('/')}
                className="bg-gradient-to-r from-indigo-600 to-cyan-700 hover:from-indigo-500 hover:to-cyan-600 text-white py-2 px-6 rounded-md transition-all duration-300 shadow-lg"
              >
                Create Your First NFT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {nfts.map((nftAddress, index) => (
                <NFTCard key={index} nftAddress={nftAddress} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// NFT Card Component
function NFTCard({ nftAddress }: { nftAddress: string }) {
  const [nftData, setNftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNFTData() {
      try {
        // In a real app, you would fetch NFT metadata from a blockchain API
        // For now, we'll simulate this with some default data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create random data for demo purposes
        const services = ["Netflix", "Spotify", "Disney+", "Amazon Prime", "Apple Music", "YouTube Premium"];
        const randomService = services[Math.floor(Math.random() * services.length)];
        const randomPrice = (Math.random() * 20 + 5).toFixed(2);
        const randomDuration = Math.floor(Math.random() * 12) + 1;
        
        setNftData({
          name: randomService,
          price: randomPrice,
          duration: randomDuration,
          image: "https://images.pexels.com/photos/218717/pexels-photo-218717.jpeg?auto=compress&cs=tinysrgb&w=600",
          paymentDate: `${Math.floor(Math.random() * 28) + 1}th of each month`
        });
      } catch (error) {
        console.error('Error fetching NFT data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNFTData();
  }, [nftAddress]);

  if (loading) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-xl h-96 animate-pulse flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
      </div>
    );
  }

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
          <span className="font-medium text-white">${nftData.price}/month</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Duration</span>
          <span className="font-medium text-white">{nftData.duration} months</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Payment Date</span>
          <span className="font-medium text-white">{nftData.paymentDate}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">NFT Address</span>
          <span className="font-mono text-xs text-indigo-300 truncate max-w-[150px]">{nftAddress}</span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">
        <a
          href={`https://explorer.solana.com/address/${nftAddress}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-center bg-slate-800/80 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 py-2 px-4 rounded-md text-sm transition-colors"
        >
          View on Solana Explorer
        </a>
      </CardFooter>
    </Card>
  );
}