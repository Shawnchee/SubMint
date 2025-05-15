"use client";

import {Keypair, clusterApiUrl} from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { 
  keypairIdentity, 
  generateSigner, 
  percentAmount,
  publicKey as umiPublicKey
} from "@metaplex-foundation/umi";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import bs58 from 'bs58';

const DEVNET_RPC = clusterApiUrl("devnet");

export async function mintSubscriptionNFT({
  wallet,
  title,
  description,
  metadataUri,
}: {
  wallet: Keypair;
  title: string;
  description: string;
  metadataUri: string;
}) {
  try {
    // Setup UMI with the correct plugins
    const umi = createUmi(DEVNET_RPC)
      .use(mplTokenMetadata());
      
    // Convert Solana wallet to UMI signer format
    const umiKeypair = {
      publicKey: umiPublicKey(wallet.publicKey.toBytes()),
      secretKey: wallet.secretKey,
    };
    
    // Set the identity for UMI
    umi.use(keypairIdentity(umiKeypair));
    
    // Generate a signer for this specific NFT mint
    const nftMint = generateSigner(umi);
    
    console.log("Starting NFT mint process...");
    
    // Use the image URI directly instead of embedding metadata
    // This avoids the "URI too long" error
    const mintTx = await createNft(umi, {
      mint: nftMint,
      name: title,  
      symbol: "SUB",
      uri: metadataUri, // Just use the image URI directly
      sellerFeeBasisPoints: percentAmount(0), // 0% royalty
      isMutable: true,
    }).sendAndConfirm(umi);
    
    console.log("NFT created successfully");
    console.log("Mint address:", nftMint.publicKey);

    let formattedSignature;
    try {
      if (Array.isArray(mintTx.signature)) {
        // Handle array format
        formattedSignature = bs58.encode(new Uint8Array(mintTx.signature));
      } else if (mintTx.signature instanceof Uint8Array) {
        // Handle Uint8Array format
        formattedSignature = bs58.encode(mintTx.signature);
      } else if (typeof mintTx.signature === 'object' && mintTx.signature !== null) {
        // Handle object format (uncommon)
        console.log("Unusual signature format:", mintTx.signature);
        
        // Try to get the bytes if available
        const sigBytes = (mintTx.signature as { bytes?: Uint8Array }).bytes || mintTx.signature;
        formattedSignature = bs58.encode(new Uint8Array(sigBytes));
      } else {
        // Handle string or other format
        formattedSignature = (mintTx.signature as any).toString();
      }
      
      console.log("Formatted signature:", formattedSignature);
    } catch (e) {
      console.error("Error formatting signature:", e);
      // Fallback to string representation
      formattedSignature = String(mintTx.signature);
    }
    
    return {
      signature: formattedSignature,
      mintAddress: nftMint.publicKey
    };
  } catch (error: any) {
    console.error("Error creating NFT:", error);
    
    // More descriptive error messages
    if (error.message?.includes("Attempt to debit an account but found no record of a prior credit")) {
      throw new Error("Your wallet doesn't have enough SOL. Please fund your wallet with devnet SOL.");
    }
    
    throw error;
  }
}