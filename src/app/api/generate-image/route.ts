import { NextResponse } from "next/server";
import Replicate from "replicate";

// Set function timeout for Vercel (increase to handle longer generation times)
export const maxDuration = 60;

// Fallback image if all else fails
const FALLBACK_IMAGE_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2zbGvCe-Ihgi4DETbEND8RPM0xX40AOI84Q&s";

export async function POST(request: Request) {
  try {
    // Verify API token is available
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      console.error("Missing Replicate API token");
      return NextResponse.json({ 
        error: "API configuration error", 
        imageUrl: FALLBACK_IMAGE_URL 
      }, { status: 500 });
    }
    
    // Initialize Replicate with the token
    const replicate = new Replicate({
      auth: apiToken,
    });
    
    // Parse request
    const body = await request.json();
    const { prompt } = body;
    
    if (!prompt) {
      return NextResponse.json({ 
        error: "Image prompt is required",
        imageUrl: FALLBACK_IMAGE_URL
      }, { status: 400 });
    }
    
    console.log("Running Replicate image generation with prompt:", prompt);
    
    // Call Replicate's image generation API
    // Keeping the original model as requested
    const output = await replicate.run(
      "black-forest-labs/flux-schnell", 
      {
        input: {
          prompt: prompt,
        },
      }
    );

    console.log("Replicate output type:", typeof output);
    console.log("Replicate output value:", JSON.stringify(output));
    
    // Handle different output formats with improved extraction
    let imageUrl;
    
    if (Array.isArray(output) && output.length > 0) {
      // Use the first URL if it's an array
      imageUrl = output[0];
      console.log("Found image URL in array:", imageUrl);
    } else if (typeof output === 'string') {
      // Use directly if it's a string URL
      imageUrl = output;
      console.log("Found direct string URL:", imageUrl);
    } else if (output && typeof output === 'object') {
      // Try to extract URL from object with more thorough checks
      console.log("Searching for URL in object properties");
      
      if ('output' in output) {
        if (Array.isArray(output.output) && output.output.length > 0) {
          imageUrl = output.output[0];
          console.log("Found URL in output array:", imageUrl);
        } else if (typeof output.output === 'string') {
          imageUrl = output.output;
          console.log("Found URL in output string:", imageUrl);
        }
      }
      
      if (!imageUrl && 'image' in output) {
        imageUrl = output.image;
        console.log("Found URL in image property:", imageUrl);
      }
      
      if (!imageUrl && 'url' in output) {
        imageUrl = output.url;
        console.log("Found URL in url property:", imageUrl);
      }
      
      // Additional check for nested arrays
      if (!imageUrl && 'images' in output && Array.isArray(output.images) && output.images.length > 0) {
        imageUrl = output.images[0];
        console.log("Found URL in images array:", imageUrl);
      }
    }
    
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      console.log("No valid image URL from Replicate, using fallback");
      return NextResponse.json({
        imageUrl: FALLBACK_IMAGE_URL,
        fallback: true,
        originalOutput: output
      });
    }

    // Successful result
    console.log("Successfully generated image:", imageUrl);
    return NextResponse.json({
      imageUrl: imageUrl,
      success: true
    });
  } catch (error: any) {
    console.error("Error in image generation:", error);
    return NextResponse.json({
      imageUrl: FALLBACK_IMAGE_URL,
      fallback: true,
      error: error.message || "Failed to generate image"
    }, { status: 500 });
  }
}