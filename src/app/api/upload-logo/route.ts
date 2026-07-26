import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { image, oldPublicId } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
        console.log(`Deleted old logo: ${oldPublicId}`);
      } catch (err) {
        console.warn("Failed to delete old logo:", err);
      }
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "task_manager_logos",
      transformation: [
        { width: 800, crop: "limit", fetch_format: "auto", quality: "auto" }
      ],
    });

    return NextResponse.json({
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
