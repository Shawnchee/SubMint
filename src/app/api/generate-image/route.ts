import { NextResponse } from "next/server";
import Replicate from "replicate";
import { writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Fallback image if all else fails
const FALLBACK_IMAGE_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2zbGvCe-Ihgi4DETbEND8RPM0xX40AOI84Q&s";

// Helper function to read a stream
async function streamToBuffer(stream: any) {
  const reader = stream.getReader();
  const chunks = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  return Buffer.concat(chunks);
}

// Function to save image and return URL
async function saveImageAndGetUrl(buffer: any) {
  // Generate random filename
  const filename = `${crypto.randomUUID()}.png`;
  
  // Save to public directory
  const publicDir = join(process.cwd(), 'public', 'generated-images');
  const filePath = join(publicDir, filename);
  
  try {
    // Ensure directory exists
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(publicDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
    
    // Write file
    await fs.writeFile(filePath, buffer);
    
    // Return accessible URL
    return `/generated-images/${filename}`;
  } catch (error) {
    console.error("Error saving image:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: "Image prompt is required" }, { status: 400 });
    }
    
    console.log("Running Replicate image generation model...");
    
    // Call Replicate's image generation API
    const output = await replicate.run(
      "black-forest-labs/flux-schnell", 
      {
        input: {
          prompt: prompt,
        },
      }
    );

    console.log("Replicate output type:", typeof output);
    
    // Handle different output formats
    let imageUrl;
    
    if (Array.isArray(output) && output.length > 0) {
      if (typeof output[0] === 'string') {
        // If it's a string URL, use it directly
        imageUrl = output[0];
      } else if (output[0] && typeof output[0] === 'object' && 'getReader' in output[0]) {
        // It's a ReadableStream - process it
        try {
          console.log("Processing ReadableStream...");
          const buffer = await streamToBuffer(output[0]);
          const savedImageUrl = await saveImageAndGetUrl(buffer);
          
          if (savedImageUrl) {
            // Use the full URL including host
            const host = request.headers.get('host') || 'localhost:3000';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            imageUrl = `${protocol}://${host}${savedImageUrl}`;
          } else {
            throw new Error("Failed to save processed image");
          }
        } catch (err) {
          console.error("Error processing stream:", err);
          throw err;
        }
      }
    } else if (typeof output === 'string') {
      // Direct URL
      imageUrl = output;
    } else if (output && typeof output === 'object' && 'getReader' in output) {
      // Direct ReadableStream
      try {
        console.log("Processing direct ReadableStream...");
        const buffer = await streamToBuffer(output);
        const savedImageUrl = await saveImageAndGetUrl(buffer);
        
        if (savedImageUrl) {
          // Use the full URL including host
          const host = request.headers.get('host') || 'localhost:3000';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          imageUrl = `${protocol}://${host}${savedImageUrl}`;
        } else {
          throw new Error("Failed to save processed image");
        }
      } catch (err) {
        console.error("Error processing direct stream:", err);
        throw err;
      }
    }
    
    if (!imageUrl) {
      console.log("No valid image URL, using fallback");
      return NextResponse.json({
        imageUrl: FALLBACK_IMAGE_URL,
        fallback: true
      });
    }

    return NextResponse.json({
      imageUrl: imageUrl,
    });
  } catch (error: any) {
    console.error("Error in image generation:", error);
    return NextResponse.json({
      imageUrl: FALLBACK_IMAGE_URL,
      fallback: true,
      error: error.message || "Failed to generate image"
    });
  }
}