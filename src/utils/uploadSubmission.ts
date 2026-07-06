import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

export async function uploadSubmissionDocument(
  fileBuffer: Buffer,
  studentId: string,
  assignmentId: string,
  fileName: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:        "neuroviz/submissions",
        public_id:     `submission_${studentId}_${assignmentId}_${Date.now()}`,
        resource_type: "auto", // handles pdf, docx, images
        overwrite:     false,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
}