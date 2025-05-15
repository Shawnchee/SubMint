import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "../../../../utils/config";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("Uploading file to Pinata:", file.name, file.size)

    // Upload the file to Pinata
    const { cid } = await pinata.upload.public.file(file)

    // Convert CID to a gateway URL
    const url = await pinata.gateways.public.convert(cid)

    console.log("File uploaded successfully, URL:", url)

    return NextResponse.json({ fileUrl: url }, { status: 200 })
  } catch (e) {
    console.error("Error uploading file to Pinata:", e)

    // More detailed error response
    const errorMessage = e instanceof Error ? e.message : "Unknown error"
    console.error("Detailed error:", errorMessage)

    // Check if the error is related to missing environment variables
    if (errorMessage.includes("jwt") || errorMessage.includes("token")) {
      return NextResponse.json(
        {
          error: "Authentication Error",
          details: "Pinata JWT token may be missing or invalid",
        },
        { status: 401 },
      )
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
