import { NextResponse } from "next/server";
import Replicate from "replicate";

// Set function timeout for Vercel
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
    
    // Log first few characters of token to verify it's loading correctly
    console.log("API token starts with:", apiToken.substring(0, 4) + "...");
    
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
    
    // First attempt - same model with specific version hash for better reliability
    try {
      const output = await replicate.run(
        "black-forest-labs/flux-schnell:56a8e4353ad4ac6fdddf5f14b33ca2d02b91a8c0a752959f63d370789d1cf0a7", 
        {
          input: {
            prompt: prompt,
            num_inference_steps: 25
          },
        }
      );

      console.log("First attempt output:", JSON.stringify(output));
      
      // Check if we got a valid URL
      if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
        return NextResponse.json({
          imageUrl: output[0],
          success: true
        });
      }
    } catch (firstAttemptError) {
      console.error("First attempt failed:", firstAttemptError);
    }
    
    // Second attempt - same model without version hash (as originally requested)
    try {
      console.log("Trying second attempt with original model format");
      const output = await replicate.run(
        "black-forest-labs/flux-schnell", 
        {
          input: {
            prompt: prompt,
          },
        }
      );

      console.log("Second attempt output:", JSON.stringify(output));
      
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
        
        if (!imageUrl && 'images' in output && Array.isArray(output.images) && output.images.length > 0) {
          imageUrl = output.images[0];
          console.log("Found URL in images array:", imageUrl);
        }
      }
      
      if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
        console.log("Successfully found image URL in second attempt:", imageUrl);
        return NextResponse.json({
          imageUrl: imageUrl,
          success: true
        });
      }
    } catch (secondAttemptError) {
      console.error("Second attempt failed:", secondAttemptError);
    }

    // If all attempts fail, try a different model as last resort
    try {
      console.log("Trying fallback model as last resort");
      const output = await replicate.run(
        "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478", 
        {
          input: {
            prompt: prompt,
            width: 512,
            height: 512,
            num_outputs: 1
          }
        }
      );
      
      console.log("Fallback model output:", JSON.stringify(output));
      
      if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
        return NextResponse.json({
          imageUrl: output[0],
          success: true,
          model: "fallback"
        });
      }
    } catch (fallbackError) {
      console.error("Fallback model attempt failed:", fallbackError);
    }
    
    // If we reach here, all attempts failed
    console.log("All image generation attempts failed, using default fallback image");
    return NextResponse.json({
      imageUrl: FALLBACK_IMAGE_URL,
      fallback: true,
      error: "All generation attempts failed"
    });
  } catch (error: any) {
    console.error("Critical error in image generation:", error);
    return NextResponse.json({
      imageUrl: FALLBACK_IMAGE_URL,
      fallback: true,
      error: error.message || "Failed to generate image"
    }, { status: 500 });
  }
}