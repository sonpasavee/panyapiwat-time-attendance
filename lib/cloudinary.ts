import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "@/lib/api";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadAttendanceImage(file: File, folder: string) {
  if (!TYPES.has(file.type) || file.size === 0 || file.size > MAX_BYTES)
    throw new ApiError(
      400,
      "Image must be JPEG, PNG, or WebP and at most 5 MB",
      "INVALID_IMAGE",
    );
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  )
    throw new Error("Cloudinary is not configured");
  const bytes = Buffer.from(await file.arrayBuffer());
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp) throw new ApiError(400, "Uploaded content is not a supported image", "INVALID_IMAGE");
  const uploaded = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          allowed_formats: ["jpg", "png", "webp"],
          max_file_size: MAX_BYTES,
        },
        (error, result) =>
          error || !result
            ? reject(error ?? new Error("Upload failed"))
            : resolve(result),
      );
      stream.end(bytes);
    },
  );
  return { url: uploaded.secure_url, publicId: uploaded.public_id };
}

export async function deleteAttendanceImage(publicId: string) {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}
