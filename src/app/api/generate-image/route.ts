import { NextResponse } from "next/server";
import Replicate from "replicate";

// Set function timeout for Vercel
export const maxDuration = 60;

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Fallback image if all else fails
const FALLBACK_IMAGE_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2zbGvCe-Ihgi4DETbEND8RPM0xX40AOI84Q&s";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: "Image prompt is required" }, { status: 400 });
    }
    
    console.log("Running Replicate image generation with prompt:", prompt);
    
    // Call Replicate's image generation API
    const output = await replicate.run(
      "black-forest-labs/flux-schnell", 
      {
        input: {
          prompt: prompt,
        },
      }
    );

    console.log("Replicate output:", output);
    
    // Handle different output formats
    let imageUrl;
    
    if (Array.isArray(output) && output.length > 0) {
      // Use the first URL if it's an array
      imageUrl = output[0];
    } else if (typeof output === 'string') {
      // Use directly if it's a string URL
      imageUrl = output;
    }
    
    if (!imageUrl) {
      console.log("No valid image URL from Replicate, using fallback");
      return NextResponse.json({
        imageUrl: FALLBACK_IMAGE_URL,
        fallback: true
      });
    }

    // Successful result
    console.log("Successfully generated image:", imageUrl);
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