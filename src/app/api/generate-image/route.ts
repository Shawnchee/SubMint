import { NextResponse } from "next/server"
import Replicate from "replicate"

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Fallback image if all else fails
const FALLBACK_IMAGE_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2zbGvCe-Ihgi4DETbEND8RPM0xX40AOI84Q&s"

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Image prompt is required" }, { status: 400 })
    }

    console.log("Running Replicate image generation with prompt:", prompt)

    // Call Replicate's image generation API
    const output = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: prompt,
      },
    })

    console.log("Replicate output:", output)

    // Handle different output formats
    let imageUrl

    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0]
    } else if (typeof output === "string") {
      imageUrl = output
    }

    if (!imageUrl) {
      console.log("No valid image URL, using fallback")
      return NextResponse.json({
        imageUrl: FALLBACK_IMAGE_URL,
        fallback: true,
        error: "Could not generate a valid image",
      })
    }

    // Successful result
    console.log("Successfully generated image:", imageUrl)
    return NextResponse.json({
      imageUrl: imageUrl,
    })
  } catch (error) {
    console.error("Error in POST handler:", error)
    return NextResponse.json(
      {
        imageUrl: FALLBACK_IMAGE_URL,
        fallback: true,
        error: "Could not generate a valid image",
      },
      { status: 500 },
    )
  }
}
