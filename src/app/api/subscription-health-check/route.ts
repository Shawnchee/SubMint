import { NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import supabase from "@/lib/supabase/client"

interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Fetch user data to get metadata URIs
    const { data: userData, error: userError } = await supabase
      .from("user")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Get the metadata URIs from user data
    const metadataUris = userData.metadata_uris || []

    if (metadataUris.length === 0) {
      return NextResponse.json({
        recommendations: "You don't have any subscriptions yet. Start by creating your first subscription NFT.",
        overallScore: 0,
        categories: []
      })
    }

    // Fetch and process all subscription metadata
    const subscriptions = []
    let totalMonthly = 0
    let totalYearly = 0

    for (const uri of metadataUris) {
      try {
        const response = await fetch(uri)
        const metadata = await response.json()

        // Extract attributes
        const price = metadata.attributes?.find((attr: NFTAttribute) => attr.trait_type === "Price")?.value || 0
        const billingCycle = metadata.attributes?.find((attr: NFTAttribute) => 
          attr.trait_type === "Billing Cycle")?.value || "monthly"
        
        // Calculate totals based on billing cycle
        if (billingCycle.toLowerCase() === "monthly") {
          totalMonthly += Number(price)
        } else if (billingCycle.toLowerCase() === "yearly") {
          totalYearly += Number(price)
        }

        subscriptions.push({
          name: metadata.name || "Untitled Subscription",
          price: Number(price),
          billing_cycle: billingCycle,
          category: metadata.attributes?.find((attr: NFTAttribute) => attr.trait_type === "Category")?.value || "Unknown"
        })
      } catch (metadataError) {
        console.error('Error fetching NFT metadata:', metadataError)
        // Continue with next URI if one fails
      }
    }

    // Convert monthly to yearly for comparison
    const annualizedSpending = totalMonthly * 12 + totalYearly

    // Format subscription data for the AI
    const subscriptionDetails = subscriptions
      .map(
        (sub) =>
          `Name: ${sub.name}, Price: $${sub.price}, Billing: ${sub.billing_cycle}, Category: ${sub.category}`
      )
      .join("\n")

    // In your generateText call, modify the prompt to include web alternatives
const { text: aiResponse } = await generateText({
  model: openai("gpt-4o"),
  prompt: `
    Analyze these subscriptions and provide structured recommendations to optimize spending.
    
    Subscriptions:
    ${subscriptionDetails}
    
    Total Monthly Spending: $${totalMonthly.toFixed(2)}
    Total Yearly Spending: $${totalYearly.toFixed(2)}
    Annualized Total: $${annualizedSpending.toFixed(2)}
    
    Create a JSON response with the following structure:
    {
      "overallScore": number, // A score from 1-10 rating the overall subscription efficiency (10 being perfect)
      "webAlternatives": [
        {
          "for": "Subscription name",
          "alternatives": [
            {
              "name": "Alternative service name",
              "savings": "Up to XX% less", 
              "url": "website.com",
              "description": "Brief description of benefits"
            }
          ]
        }
      ],
      "categories": [
        {
          "title": "Redundancies and Overlaps",
          "score": number, // Score from 1-10 for this category
          "recommendations": [
            "Clear, specific recommendation 1",
            "Clear, specific recommendation 2"
          ]
        },
        {
          "title": "Cost-Saving Opportunities",
          "score": number,
          "recommendations": []
        },
        {
          "title": "Value Assessment",
          "score": number,
          "recommendations": []
        },
        {
          "title": "Consolidation Opportunities",
          "score": number,
          "recommendations": []
        }
      ]
    }
    
    For "webAlternatives":
    - For each subscription with price > $20, suggest 1-3 real alternative services that might be cheaper
    - Include realistic website domains, accurate pricing comparisons, and specific features
    - Focus on free, open-source, or lower-cost alternatives when possible
    - If a subscription is very niche or already optimal, you can skip it
    
    Ensure each recommendation is specific, actionable, and directly related to the subscriptions provided.
    The overallScore should reflect how well the user is optimizing their subscriptions.
    Return only valid JSON with no additional text.
  `,
})

    let structuredRecommendations;
    try {
      const jsonStartIndex = aiResponse.indexOf('{');
      const jsonEndIndex = aiResponse.lastIndexOf('}') + 1;
      const jsonString = aiResponse.substring(jsonStartIndex, jsonEndIndex);
      
      structuredRecommendations = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      structuredRecommendations = {
        overallScore: 5,
        categories: [],
        rawRecommendations: aiResponse
      };
    }

    return NextResponse.json({
      ...structuredRecommendations,
      stats: {
        totalMonthly,
        totalYearly,
        annualizedSpending,
      },
    })
  } catch (error) {
    console.error("Error in subscription health check:", error)
    return NextResponse.json({ error: "Failed to analyze subscriptions" }, { status: 500 })
  }
}