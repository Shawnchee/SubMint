import { NextResponse } from "next/server";
import Replicate from "replicate";

// Set function timeout for Vercel (maximum allowed on hobby plan)
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
    
    // Create a promise with timeout to avoid Vercel timeout issues
    const outputPromise = replicate.run(
      // Use the model without version hash to reduce loading time
      "black-forest-labs/flux-schnell", 
      {
        input: {
          prompt: prompt,
          // Smaller steps means faster generation
          num_inference_steps: 20,
        },
      }
    );
    
    // Add a timeout to ensure we don't hit Vercel's 60-second limit
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Image generation timed out")), 45000); // 45 seconds
    });
    
    // Race the model generation against our timeout
    const output = await Promise.race([outputPromise, timeoutPromise])
      .catch(error => {
        console.error("Model execution error:", error);
        return null;
      });
    
    console.log("Model output:", JSON.stringify(output));
    
    // Extract image URL if possible
    let imageUrl;
    
    if (output) {
      if (Array.isArray(output) && output.length > 0) {
        imageUrl = output[0];
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (output && typeof output === 'object') {
        // Try common output formats
        if ('output' in output) imageUrl = Array.isArray(output.output) ? output.output[0] : output.output;
        if (!imageUrl && 'image' in output) imageUrl = output.image;
        if (!imageUrl && 'url' in output) imageUrl = output.url;
        if (!imageUrl && 'images' in output && Array.isArray(output.images)) imageUrl = output.images[0];
      }
    }
    
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      return NextResponse.json({
        imageUrl: imageUrl,
        success: true
      });
    }
    
    // If we couldn't get a valid URL, return the fallback
    return NextResponse.json({
      imageUrl: FALLBACK_IMAGE_URL,
      fallback: true,
      error: "Could not generate a valid image"
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