import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "../../../../utils/config";

export async function POST(request: NextRequest) {
  try {
    // Parse the metadata from the request
    const data = await request.json();
    
    
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
        { trait_type: "Proof", value: data.proof || "N/A" }
        
      ]
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
    
    return NextResponse.json({ metadataUri }, { status: 200 });
  } catch (e) {
    console.error("Error uploading metadata:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}