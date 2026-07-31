import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { publicIds } = await request.json();

    if (!publicIds || !Array.isArray(publicIds)) {
      return NextResponse.json(
        { error: "Array of publicIds is required" },
        { status: 400 }
      );
    }

    if (publicIds.length === 0) {
       return NextResponse.json({ success: true, message: "No publicIds provided" });
    }

    // Delete multiple assets from Cloudinary
    const promises = publicIds.map((id) => cloudinary.uploader.destroy(id));
    await Promise.all(promises);

    console.log(`Deleted chat attachments from Cloudinary:`, publicIds);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cloudinary delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete attachments" },
      { status: 500 }
    );
  }
}
