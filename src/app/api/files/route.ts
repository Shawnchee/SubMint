import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "../../../../utils/config";

// Allowed origins - only your own domains
const allowedOrigins = ['https://submint.vercel.app'];

// Add size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'application/json'];

// Simple API key validation
function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  return apiKey === process.env.API_SECRET_KEY || 
         apiKey === process.env.NEXT_PUBLIC_API_KEY;
}

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight
  const origin = request.headers.get('origin') || '';
  
  if (!allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 204 });
  }
  
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
    status: 204,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Validate origin for CORS
    const origin = request.headers.get('origin') || '';
    const allowedOrigin = allowedOrigins.includes(origin) ? origin : null;
    
    // Check API key
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
    
    // Process the upload
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      const response = NextResponse.json(
        { error: "No file provided" }, 
        { status: 400 }
      );
      
      if (allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      }
      
      return response;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const response = NextResponse.json(
        { error: "File too large" }, 
        { status: 400 }
      );
      
      if (allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      }
      
      return response;
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      const response = NextResponse.json(
        { error: "Invalid file type" }, 
        { status: 400 }
      );
      
      if (allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      }
      
      return response;
    }

    console.log("Uploading file to Pinata:", file.name, file.size);

    // Upload the file to Pinata
    const { cid } = await pinata.upload.public.file(file);
    const url = await pinata.gateways.public.convert(cid);

    console.log("File uploaded successfully, URL:", url);

    const response = NextResponse.json({ fileUrl: url }, { status: 200 });
    
    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    }
    
    return response;
  } catch (e) {
    // Error handling remains similar with CORS headers added
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const status = errorMessage.includes("jwt") ? 401 : 500;
    
    const response = NextResponse.json(
      { error: "Error processing upload", details: errorMessage },
      { status }
    );
    
    const origin = request.headers.get('origin') || '';
    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    return response;
  }
}