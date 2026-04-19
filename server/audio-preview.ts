import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const uploadsDir = path.join(process.cwd(), "uploads");

/**
 * Uses ffmpeg to cut a preview clip from a full audio file.
 * Saves the clip as an MP3 to /uploads/preview-{releaseId}.mp3
 * Returns the public URL of the preview, or null on failure.
 *
 * Fast seek is used (-ss before -i) so ffmpeg seeks to the nearest
 * keyframe without decoding the full file — efficient even for large WAVs.
 * For uncompressed WAV sources every sample is a keyframe so precision
 * is exact to the millisecond.
 */
export async function generateAudioPreview(
  audioFileUrl: string,
  releaseId: string,
  startSeconds: number,
  durationSeconds: number,
): Promise<string | null> {
  if (!audioFileUrl || !audioFileUrl.startsWith("/uploads/")) return null;

  const inputPath = path.join(process.cwd(), audioFileUrl);
  if (!fs.existsSync(inputPath)) {
    console.warn(`[preview] source file not found: ${inputPath}`);
    return null;
  }

  const outputFilename = `preview-${releaseId}.mp3`;
  const outputPath = path.join(uploadsDir, outputFilename);

  const start = Math.max(0, Number(startSeconds) || 0);
  const duration = Math.max(1, Number(durationSeconds) || 30);

  const cmd = [
    "ffmpeg",
    `-ss ${start}`,
    `-i "${inputPath}"`,
    `-t ${duration}`,
    `-acodec libmp3lame`,
    `-q:a 2`,
    `-map_metadata -1`,
    `"${outputPath}"`,
    `-y`,
  ].join(" ");

  try {
    await execAsync(cmd);
    console.log(`[preview] generated ${outputFilename} (${start}s + ${duration}s)`);
    return `/uploads/${outputFilename}`;
  } catch (err: any) {
    console.error(`[preview] ffmpeg failed for release ${releaseId}:`, err.stderr ?? err.message);
    return null;
  }
}

/**
 * Deletes the preview clip for a release if it exists.
 */
export function deleteAudioPreview(releaseId: string): void {
  const previewPath = path.join(uploadsDir, `preview-${releaseId}.mp3`);
  if (fs.existsSync(previewPath)) {
    fs.unlinkSync(previewPath);
    console.log(`[preview] deleted preview for release ${releaseId}`);
  }
}
