import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import path from "path";

export async function uploadCertification(
  fileBuffer: Buffer,
  userId: string,
  fileName: string
): Promise<string> {
  const ext = path.parse(fileName).ext;                    // ".pdf"
  const nameWithoutExt = path.parse(fileName).name;         // "Certificate Cryptography..."
  const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_"); // sanitize spaces/special chars
  const publicId = `cert_${userId}_${Date.now()}_${safeName}${ext}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "neuroviz/certifications",
        public_id: publicId,
        resource_type: "raw",
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
}