import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "../../../../utils/config";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    // Upload the file to Pinata
    const { cid } = await pinata.upload.public.file(file);
    
    // Convert CID to a gateway URL
    const url = await pinata.gateways.public.convert(cid);
    
    return NextResponse.json(url, { status: 200 });
  } catch (e) {
    console.error("Error uploading file to Pinata:", e);
    
    // Return proper JSON for errors instead of throwing
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}