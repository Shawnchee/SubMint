import { NextResponse, type NextRequest } from "next/server";
import Replicate from "replicate";
import crypto from "crypto";
import supabase from "@/lib/supabase/server";

// Set maxDuration for Vercel (hobby plan limit)
export const maxDuration = 60;

// Fallback image if all else fails
const FALLBACK_IMAGE_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2zbGvCe-Ihgi4DETbEND8RPM0xX40AOI84Q&s";

const allowedOrigins = ['https://submint.vercel.app', 'http://localhost:3000'];


function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  return apiKey === process.env.API_SECRET_KEY || 
         apiKey === process.env.NEXT_PUBLIC_API_KEY;
}

function corsResponse(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin') || '';

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  if (!allowedOrigins.includes(origin) && process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 204 });
  }
  
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
      'Access-Control-Max-Age': '86400',
    },
    status: 204,
  });
}

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Function to handle ReadableStream response
async function handleStreamResponse(stream: any): Promise<string | null> {
  try {
    console.log("Processing ReadableStream from Replicate");
    
    // Create a buffer to store the image data
    const chunks = [];
    const reader = stream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine all chunks into a single Uint8Array
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const imageBuffer = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      imageBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Generate a unique filename
    const filename = `${crypto.randomUUID()}.png`;
    const filePath = `generated/${filename}`;
    
    console.log("Uploading stream data to Supabase bucket: minted-nft, path:", filePath);
    
    // Upload to Supabase
    const { data, error } = await supabase
  .storage
  .from('minted-nft')       // Bucket name only goes here
  .upload(`nft/${filePath}`, // Include folder in path
    imageBuffer, 
    {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true  // Add this to avoid conflicts
    }
  );
    
    if (error) {
      throw error;
    }
    
    // Get the public URL
    const { data: urlData } = supabase
  .storage
  .from('minted-nft')       // Bucket name only
  .getPublicUrl(`nft/${filePath}`);
    
    console.log("Successfully uploaded stream to Supabase:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error processing stream:", error);
    return null;
  }
}

// Function to download image from URL and upload to Supabase
async function uploadImageToSupabase(imageUrl: string): Promise<string | null> {
  try {
    console.log("Downloading image from:", imageUrl);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    // Generate a unique filename
    const filename = `${crypto.randomUUID()}.png`;
    const filePath = `generated/${filename}`;
    
    console.log("Uploading to Supabase bucket: minted-nft, path:", filePath);
    
    // Upload to Supabase
    const { data, error } = await supabase
  .storage
  .from('minted-nft')       // Bucket name only
  .upload(`nft/${filePath}`, // Include folder in path
    imageBuffer, 
    {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true  // Add this to avoid conflicts
    }
  );
    
    if (error) {
      throw error;
    }
    
    // Get the public URL
    const { data: urlData } = supabase
  .storage
  .from('minted-nft')       // Bucket name only
  .getPublicUrl(`nft/${filePath}`);
    
    console.log("Successfully uploaded to Supabase:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading to Supabase:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {

    const origin = request.headers.get('origin') || '';
    const allowedOrigin = allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development' 
      ? origin 
      : null;

      if (!validateApiKey(request)) {
      const response = NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
      
      if (allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      }
      
      return response;
    }
    const { prompt } = await request.json();

    if (!prompt) {
      const response = NextResponse.json(
        { error: "Image prompt is required" }, 
        { status: 400 }
      );
      return corsResponse(response, request);
    }
    console.log("Running Replicate image generation with prompt:", prompt);

    // Changed back to the requested model
    const output = await replicate.run(
      "black-forest-labs/flux-schnell", 
      {
        input: {
          prompt: prompt,
        },
      }
    );

    console.log("Replicate output type:", typeof output);
    console.log("Replicate output:", output);

    // Handle different response types from Replicate
    let supabaseUrl = null;

    // Case 1: Array of strings (URLs)
    if (Array.isArray(output) && output.length > 0) {
      if (typeof output[0] === 'string') {
        // Standard URL response
        const replicateImageUrl = output[0];
        supabaseUrl = await uploadImageToSupabase(replicateImageUrl);
      } 
      else if (output[0] instanceof ReadableStream || 
               (typeof output[0] === 'object' && output[0] && 'getReader' in output[0])) {
        // ReadableStream response
        supabaseUrl = await handleStreamResponse(output[0]);
      }
    } 
    // Case 2: Single string (URL)
    else if (typeof output === 'string') {
      supabaseUrl = await uploadImageToSupabase(output);
    }
    // Case 3: Single ReadableStream
    else if (output instanceof ReadableStream || 
            (typeof output === 'object' && output && 'getReader' in output)) {
      supabaseUrl = await handleStreamResponse(output);
    }

if (supabaseUrl) {
      console.log("Successfully generated and stored image:", supabaseUrl);
      const response = NextResponse.json({
        imageUrl: supabaseUrl,
        success: true
      });
      return corsResponse(response, request);
    }

    // If we couldn't get a valid URL or handle the stream, use fallback
    console.log("Failed to process image response, using fallback");
    const response = NextResponse.json({
      imageUrl: FALLBACK_IMAGE_URL,
      fallback: true
    });
    return corsResponse(response, request);

    
  } catch (error) {
    console.error("Error in POST handler:", error);
    const response = NextResponse.json({
      imageUrl: FALLBACK_IMAGE_URL,
      error: "Failed to generate image",
      fallback: true
    }, { status: 500 });
    return corsResponse(response, request);
  }
}