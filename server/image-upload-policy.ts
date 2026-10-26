export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export function isSupportedImageUploadSize(bytes: number): boolean {
  return Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= MAX_IMAGE_BYTES;
}
