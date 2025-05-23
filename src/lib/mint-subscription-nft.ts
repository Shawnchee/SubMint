"use client";

import {Keypair, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
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

function truncateName(name: string, maxLength = 32): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}

async function uploadMetadataToPinata(childMetadata: any) {
  try {
    const metadataResponse = await fetch("/api/metadata-to-pinata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_API_KEY ?? "",
      },
      body: JSON.stringify({
        title: childMetadata.name,
        description: childMetadata.description,
        imageUri: childMetadata.image,
        // Pass through the existing attributes from the childMetadata
        price: childMetadata.attributes.find((attr: any) => attr.trait_type === "Price")?.value || "0",
        recurringDate: childMetadata.attributes.find((attr: any) => attr.trait_type === "Payment Date")?.value || "",
        startDate: childMetadata.attributes.find((attr: any) => attr.trait_type === "Start Date")?.value || "",
        endDate: childMetadata.attributes.find((attr: any) => attr.trait_type === "End Date")?.value || "",
        proof: childMetadata.attributes.find((attr: any) => attr.trait_type === "Proof")?.value || "",
        // Add any custom attributes we want to include
        wallet_address: childMetadata.attributes.find((attr: any) => attr.trait_type === "Wallet Address")?.value || "",
        nft_type: childMetadata.attributes.find((attr: any) => attr.trait_type === "NFT Type")?.value || ""
      }),
    });

    if (!metadataResponse.ok) {
      const errorData = await metadataResponse.json();
      throw new Error(errorData.error || "Failed to upload metadata");
    }

    const { metadataUri } = await metadataResponse.json();
    return metadataUri;
  } catch (error) {
    console.error("Error uploading metadata to Pinata:", error);
    throw error;
  }
}

export async function mintSubscriptionNFT({
  wallet,
  title,
  description,
  metadataUri,
  sharedUsers = [],
  parentMintAddress = null
}: {
  wallet: Keypair;
  title: string;
  description: string;
  metadataUri: string;
  sharedUsers?: Array<{ name: string; wallet_address?: string }>;
  parentMintAddress?: string | null;
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


    const rawNftName = parentMintAddress ? `${title} - Shared Access` : title;
    const nftName = truncateName(rawNftName);
    const symbol = parentMintAddress ? "SUBSHR" : "SUB";
    
    // Use the image URI directly instead of embedding metadata
    // This avoids the "URI too long" error
    const mintTx = await createNft(umi, {
      mint: nftMint,
      name: nftName,
      symbol: symbol,
      uri: metadataUri, 
      sellerFeeBasisPoints: percentAmount(0), 
      isMutable: true, // Set to true for mutable NFTs
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

export async function mintChildNFTs({
  wallet,
  parentMintAddress,
  title,
  metadataUri,
  sharedUsers
}: {
  wallet: Keypair;
  parentMintAddress: string;
  title: string;
  metadataUri: string;
  sharedUsers: Array<{ name: string; wallet_address?: string; id: string }>;
}) {
    const results = [];
  const errors = [];

  let parentMetadata;
  try {
    const response = await fetch(metadataUri);
    parentMetadata = await response.json();
  } catch (error) {
    console.error("Error fetching parent metadata:", error);
    throw new Error("Could not fetch parent metadata");
  }

  for (const user of sharedUsers) {
    try {

      const shortTitle = truncateName(title, 20); // Leave room for the username
      // Add safety check for user.name
      const userName = user.name || "User";
      const safeUserName = typeof userName === 'string' ? userName : "User";
      const childTitle = `${shortTitle} - ${safeUserName.substring(0, 10)}`;
      // Create a child NFT for this user
      const childMetadata = {
        ...parentMetadata,
        name: childTitle,
        description: `Shared access for ${safeUserName}`,
        attributes: [
          ...parentMetadata.attributes.filter((attr: any) => 
            attr.trait_type !== "Wallet Address" && attr.trait_type !== "NFT Type"
          ),
          { trait_type: "Wallet Address", value: user.wallet_address || "Not specified" },
          { trait_type: "NFT Type", value: "Child NFT" }
        ]
      };

      // Upload the child metadata to Pinata
      const childMetadataUri = await uploadMetadataToPinata(childMetadata);
      
      // Create a child NFT with the custom metadata
      const childResult = await mintSubscriptionNFT({
        wallet,
        title: childTitle,
        description: `Shared access for ${safeUserName}`,
        metadataUri: childMetadataUri,
        parentMintAddress
      });
      
      results.push({
        ...childResult,
        userId: user.id,
        userName: user.name
      });
    } catch (error) {
      console.error(`Error minting child NFT for ${user.name}:`, error);
      errors.push({
        userId: user.id,
        userName: user.name,
        error: typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : "Unknown error"
      });
    }
  }

  return { results, errors };
}
