"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase/client';
import { clearBurnerWallet, getOrCreateBurnerWallet } from '@/lib/burner-wallet';
import { Card, CardContent} from "@/components/ui/card";
import { useAuth } from '@/hooks/check-auth';
import NFTCard from '@/components/nft-card-owned';
import SubscriptionStats from '@/components/subscription-stats';



interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
}
interface Subscription {
  name: string;
  price: number;
  billing_cycle: string;
  category?: string;
}

interface NFTWithRelationship {
  metadataUri: string;
  mintAddress: string;
  isParent: boolean;
  childNfts?: ChildNft[];
  sharedByName?: string;
  sharedByWallet?: string;
  userName?: string;
  userEmail?: string;
}

interface ChildNft {
  mintAddress: string;
  metadataUri: string;
  userId: string;
  userName: string;
}

const getProfileCache = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem('profile-cache');
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.error('Error reading profile cache:', e);
    return null;
  }
};

const saveProfileCache = (data: any) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('profile-cache', JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Error saving profile cache:', e);
  }
};

function formatWalletAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}



export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [resetWalletLoading, setResetWalletLoading] = useState(false);
  const { user: authUser, loading: authloading } = useAuth();
  const [metadataUris, setMetadataUris] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [nftsWithRelationships, setNftsWithRelationships] = useState<NFTWithRelationship[]>([]);
  const [sharedWithMeNfts, setSharedWithMeNfts] = useState<NFTWithRelationship[]>([]);


useEffect(() => {
  // Hardcoded NFT mint address
  const hardcodedNftAddress = "iJPvM1myySujbHsSgceh4FB5b59H4AoreG67tJ4mdx9";
  
  // Fetch metadata for this specific NFT
  async function fetchHardcodedNft() {
    try {
      // Use your provided metadata URI instead of fetching or using the old fallback
      const metadataUri = "https://purple-historic-bird-762.mypinata.cloud/ipfs/bafkreig6cdjm5xeoydonoz3nchiz5hkje5wxosc2bfio3genxhtqgxof2u";
      
      // Create a hardcoded shared NFT entry
      const hardcodedNft: NFTWithRelationship = {
        mintAddress: hardcodedNftAddress,
        metadataUri,
        isParent: false,
        sharedByName: "Shawn Chee",
        sharedByWallet: "9GP7YDcpfLjnqzJJJm3SFjxnLh1W7vimNJKD5GRDVwc5",
        userName: "You"
      };
      
      // Add this NFT to the shared NFTs list
      setSharedWithMeNfts(prev => {
        // Check if it already exists to avoid duplicates
        if (prev.some(nft => nft.mintAddress === hardcodedNftAddress)) {
          return prev;
        }
        return [...prev, hardcodedNft];
      });
      
    } catch (error) {
      console.error("Error fetching hardcoded NFT:", error);
    }
  }
  
  fetchHardcodedNft();
}, []); // Empty dependency array ensures this runs once on mount

  const cachedData = getProfileCache();

  const shouldRefreshCache = () => {
    if (!cachedData || !cachedData.timestamp) return true;
    const fiveMinutesInMs = 5 * 60 * 1000;
    return Date.now() - cachedData.timestamp > fiveMinutesInMs;
  };

  useEffect(() => {
    if (cachedData && !shouldRefreshCache() && initialLoad) {
      setInitialLoad(false);
      return;
    }

    async function fetchUserProfile() {
      if (!authUser) return;

      try {
        if (!cachedData) {
          setLoading(true);
        }
        
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
        const nftAddresses = userData.nft_address || [];
      const metadataUris = userData.metadata_uris || [];
      const sharedUsersData = userData.subscription_shared_users || [];
      
      // Also fetch NFT relationships from database
      const { data: relationships } = await supabase
        .from('nft_relationships')
        .select('*')
        .in('parent_mint_address', nftAddresses);
      
      // Create structured NFT data with relationships
      const structuredNfts: NFTWithRelationship[] = [];
      
      // Process each NFT
      for (let i = 0; i < nftAddresses.length; i++) {
        const mintAddress = nftAddresses[i];
        const metadataUri = i < metadataUris.length ? metadataUris[i] : null;
        
        if (!metadataUri) continue;
        
        // Check if this is a parent NFT with child NFTs
        const sharedEntry = sharedUsersData.find((entry: any) => entry.mint_address === mintAddress);
        const isParent = !!sharedEntry;
        
        // Find child NFTs from relationships data
        const childRelationships = relationships?.filter(rel => rel.parent_mint_address === mintAddress) || [];
        
        const childNfts = childRelationships.map(rel => ({
          mintAddress: rel.child_mint_address,
          metadataUri: metadataUri, // Child NFTs typically share parent's metadata
          userId: rel.user_id,
          userName: rel.user_name || 'Shared User'
        }));
        
        structuredNfts.push({
          mintAddress,
          metadataUri,
          isParent,
          childNfts: isParent ? childNfts : undefined
        });
      }
      
        setNftsWithRelationships(structuredNfts);
        setMetadataUris(metadataUris); 
        setLoading(false);

        saveProfileCache({
          user: userData,
          walletAddress: walletAddress,
          metadataUris: userData.metadata_uris || [],
          subscriptions: [] // Will be updated later
        });

      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserProfile();
  }, [router, authUser, initialLoad]);

  useEffect(() => {
    if (!walletAddress) return;
      async function fetchSharedWithMeNFTs() {
  try {
    if (!walletAddress) return;

    // First, get user entries from payment_users that match this wallet
    const { data: matchedUsers } = await supabase
      .from('payment_users')
      .select('id, user_name, email')
      .eq('wallet_address', walletAddress);

    if (!matchedUsers || matchedUsers.length === 0) {
      console.log("No matching payment users found for this wallet");
      return;
    }
    console.log("Matched users:", matchedUsers);

    // Get the IDs of matching users
    const userIds = matchedUsers.map(user => user.id);

    // Now fetch NFT relationships where the payment_user_id matches any of our found IDs
const { data: sharedWithMeRelations } = await supabase
  .from('nft_relationships')
  .select('*, parent_mint_address, child_mint_address')
  .in('user_id', userIds);

    if (!sharedWithMeRelations || sharedWithMeRelations.length === 0) {
      console.log("No NFT relationships found for this user");
      return;
    }

    console.log("Shared with me relations:", sharedWithMeRelations);
    // Get the parent NFT addresses to fetch their metadata
    const parentNftAddresses = [...new Set(sharedWithMeRelations.map(rel => rel.parent_mint_address))];
    
    // Fetch parent NFT metadata
    const sharedNFTs: NFTWithRelationship[] = [];
    
    for (const parentAddress of parentNftAddresses) {
      // Find the relation for this parent
      const relation = sharedWithMeRelations.find(rel => rel.parent_mint_address === parentAddress);
      
      if (!relation) continue;

      // Get the child NFT that belongs to this user
      const childAddress = relation.child_mint_address;
      
      // Find the user who matched
      const matchedUser = matchedUsers.find(user => user.id === relation.payment_user_id);
      if (!matchedUser) continue;
      
      // Try to fetch metadata URI from our nft_metadata table first
      const { data: nftData } = await supabase
        .from('nft_metadata')
        .select('metadata_uri')
        .eq('mint_address', childAddress)
        .single();
      
      let metadataUri = nftData?.metadata_uri;
      
      // If we couldn't find it, try to get it from the parent NFT
      if (!metadataUri) {
        const { data: parentData } = await supabase
          .from('nft_metadata')
          .select('metadata_uri')
          .eq('mint_address', parentAddress)
          .single();
          
        metadataUri = parentData?.metadata_uri;
      }
      
      // If we still don't have metadata, try getting from the URI stored in the relationship
      if (!metadataUri && relation.metadata_uri) {
        metadataUri = relation.metadata_uri;
      }
      
      if (metadataUri) {
        sharedNFTs.push({
          mintAddress: childAddress,
          metadataUri,
          isParent: false,
          sharedByName: relation.owner_name || 'Unknown',
          sharedByWallet: relation.owner_wallet_address,
          userName: matchedUser.user_name || 'You',
          userEmail: matchedUser.email
        });
      }
    }
    
    console.log("Shared NFTs fetched successfully:", sharedNFTs);
    setSharedWithMeNfts(sharedNFTs);
    
  } catch (error) {
    console.error('Error fetching shared NFTs:', error);
  }
}

  fetchSharedWithMeNFTs();

  }, [walletAddress]);

  

    // Process metadata URIs to extract subscription data for analytics
  useEffect(() => {

    if (cachedData?.subscriptions?.length > 0 && initialLoad && metadataUris.length === cachedData.metadataUris.length) {
      return;
    }
    async function processSubscriptionData() {
      if (metadataUris.length === 0) return;
      
      try {
        setSubscriptionsLoading(true);
        const subscriptionData: Subscription[] = [];
        
        for (const uri of metadataUris) {
          try {
            const response = await fetch(uri);
            const metadata: NFTMetadata = await response.json();
            
            // Extract subscription details from metadata
            const price = metadata.attributes.find(attr => attr.trait_type === "Price")?.value || "0";
            const billingCycle = metadata.attributes.find(attr => attr.trait_type === "Billing Cycle")?.value || "Monthly";
            const category = metadata.attributes.find(attr => attr.trait_type === "Category")?.value;
            
            subscriptionData.push({
              name: metadata.name,
              price: Number(price),
              billing_cycle: billingCycle.toLowerCase(),
              category: category
            });
          } catch (error) {
            console.error('Error processing metadata URI:', uri, error);
            // Continue processing other URIs
          }
        }
        
        setSubscriptions(subscriptionData);

        saveProfileCache({
          user,
          walletAddress,
          metadataUris,
          subscriptions: subscriptionData
        });
      } catch (error) {
        console.error('Error processing subscription data:', error);
      } finally {
        setSubscriptionsLoading(false);
      }
    }
    
    processSubscriptionData();
  }, [metadataUris, initialLoad]);

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
    localStorage.removeItem('profile-cache');
    await supabase.auth.signOut();
    router.push('/authentication');
  };
  console.log("Loading profile:", loading);
    console.log("Auth loading:", authloading);
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
                  <Image 
                    src="/pfp.jpg"
                    alt="Profile Picture"
                    fill
                    className="object-cover"
                  />
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
        
<div className="mb-8">
  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 mb-6">
    Your Subscription NFTs
  </h2>

  {nftsWithRelationships.length === 0 ? (
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
    <div className="space-y-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {nftsWithRelationships.map((nft, index) => (
        <div key={index} className="bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
          {/* Parent NFT */}
          <div className="p-4">
            <NFTCard metadataUri={nft.metadataUri} />
            
          </div>
        </div>
      ))}
    </div>
  )}
</div>

{/* Shared With Me Section */}
{sharedWithMeNfts.length > 0 && (
  <div className="mb-12">
    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300 mb-6">
      Subscriptions Shared With Me
    </h2>
    
    <div className="space-y-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sharedWithMeNfts.map((nft, index) => (
        <div key={index} className="bg-slate-800/60 backdrop-blur-md border border-purple-800/30 rounded-xl overflow-hidden">
          <div className="p-4">
            <div className="mb-3 flex items-center text-sm text-purple-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
              Shared by: {nft.sharedByName || 'Unknown'}
            </div>
            
            <NFTCard metadataUri={nft.metadataUri} />
            
            <div className="mt-3 text-xs text-slate-400">
              NFT: {formatWalletAddress(nft.mintAddress)}
              <a 
                href={`https://explorer.solana.com/address/${nft.mintAddress}?cluster=devnet`}
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View on Explorer ↗
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
  
        {/* Subscription Analytics Section */}
        <div className="mt-12">{user && <SubscriptionStats userId={user.id} subscriptions={subscriptions} />}</div>
  </div>
  </div>
  )
}



          
          

