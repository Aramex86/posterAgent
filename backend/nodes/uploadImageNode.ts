import { v2 as cloudinary } from "cloudinary";
import { unlinkSync, existsSync } from "fs";
import { StateType } from "../state";
import { env } from "../env";

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadImageNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- ☁️ EXECUTING IMAGE UPLOAD NODE ---");

  // If no image was generated, skip upload
  if (!state.imageUrl || state.imageUrl === "") {
    console.log("⚠️ No image path found. Skipping Cloudinary upload.");
    return {
      imageUrl: "",
      status:
        state.status === "IMAGE_SKIPPED_NO_CODE"
          ? "IMAGE_SKIPPED_NO_CODE"
          : "IMAGE_SKIPPED",
    };
  }

  // If imageUrl is already a remote URL (not a local path), skip re-upload
  if (state.imageUrl.startsWith("http")) {
    console.log("🌐 Image already has a remote URL. Skipping upload.");
    return {
      imageUrl: state.imageUrl,
      status: "IMAGE_ALREADY_UPLOADED",
    };
  }

  const localPath = state.imageUrl;

  // Verify file exists
  if (!existsSync(localPath)) {
    console.error(`❌ Image file not found at: ${localPath}`);
    return {
      imageUrl: "",
      status: "IMAGE_UPLOAD_FAILED",
      error: `Image file not found: ${localPath}`,
    };
  }

  try {
    console.log(`📤 Uploading image to Cloudinary: ${localPath}`);

    const result = await cloudinary.uploader.upload(localPath, {
      upload_preset: env.CLOUDINARY_UPLOAD_PRESET,
      folder: "posteragent",
      resource_type: "image",
    });

    console.log(`✅ Image uploaded to Cloudinary: ${result.secure_url}`);

    // Clean up local file after successful upload
    try {
      unlinkSync(localPath);
      console.log(`🗑️ Local image deleted: ${localPath}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to delete local image: ${cleanupError}`);
    }

    return {
      imageUrl: result.secure_url,
      status: "IMAGE_UPLOADED",
      error: null,
    };
  } catch (error: any) {
    console.error("❌ Cloudinary upload failed:", error.message);
    return {
      imageUrl: "",
      status: "IMAGE_UPLOAD_FAILED",
      error: `Cloudinary upload error: ${error.message}`,
    };
  }
}
