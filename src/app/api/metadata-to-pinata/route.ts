import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "../../../../utils/config";

// Allowed origins - only your own domains
const allowedOrigins = ['https://submint.vercel.app', 'http://localhost:3000'];

// Simple API key validation
function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  return apiKey === process.env.API_SECRET_KEY || 
         apiKey === process.env.NEXT_PUBLIC_API_KEY;
}

// Helper function to handle CORS
function corsResponse(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  // Allow the specific origin or all origins if in development
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}

// Handle OPTIONS request (preflight)
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

export async function POST(request: NextRequest) {
  try {
    // Validate origin for CORS
    const origin = request.headers.get('origin') || '';
    const allowedOrigin = allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development' 
      ? origin 
      : null;
    
    // Check API key (uncomment if you want to require API key)
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
    
    // Parse the metadata from the request
    const data = await request.json();
    
    // Extract shared_users from data, defaulting to an empty array if not present
    const shared_users = data.shared_users || [];

    // Create a proper NFT metadata object following Metaplex standard
    const nftMetadata = {
      name: data.title,
      description: data.description,
      image: data.imageUri,
      attributes: [
        { trait_type: "Price", value: data.price },
        { trait_type: "Payment Date", value: data.recurringDate },
        { trait_type: "Start Date", value: data.startDate },
        { trait_type: "End Date", value: data.endDate },
        { trait_type: "Proof", value: data.proof || "N/A" },
        ...(shared_users && shared_users.length > 0 
          ? [{ trait_type: "Shared With", value: shared_users.map((u: any) => u.name).join(", ") }] 
          : [])
      ],
      shared_users: shared_users || []
    };
    
    // Convert metadata to JSON and create a Blob/File
    const metadataFile = new File(
      [JSON.stringify(nftMetadata, null, 2)],
      "metadata.json",
      { type: "application/json" }
    );
    
    // Upload the metadata to Pinata
    const { cid } = await pinata.upload.public.file(metadataFile);
    
    // Convert CID to gateway URL
    const metadataUri = await pinata.gateways.public.convert(cid);
    
    // Success response with CORS headers
    const response = NextResponse.json({ metadataUri }, { status: 200 });
    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    }
    return response;
  } catch (e) {
    console.error("Error uploading metadata:", e);
    
    // Error response with CORS headers
    const response = NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
    
    const origin = request.headers.get('origin') || '';
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    return response;
  }
}