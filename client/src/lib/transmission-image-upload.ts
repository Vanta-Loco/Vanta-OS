import type { InsertPost } from "@shared/schema";
import { apiRequest, getAdminToken } from "@/lib/queryClient";

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The selected image could not be previewed."));
    };
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
}

export async function uploadTransmissionImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const token = getAdminToken();
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: token ? { "X-Admin-Token": token } : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || result.message || `Image upload failed (${response.status}).`);
  }
  if (typeof result.url !== "string") {
    throw new Error("Image upload did not return an image URL.");
  }
  return result.url;
}

export async function publishTransmission(
  data: InsertPost,
  coverImageFile: File,
  galleryImageFiles: File[],
): Promise<Response> {
  const coverImage = await uploadTransmissionImage(coverImageFile);
  const images: string[] = [];
  for (const file of galleryImageFiles) {
    images.push(await uploadTransmissionImage(file));
  }
  return apiRequest("POST", "/api/posts", {
    ...data,
    coverImage,
    images,
  });
}
