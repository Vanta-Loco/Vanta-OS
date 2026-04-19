import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const uploadsDir = path.join(process.cwd(), "uploads");

/**
 * Converts a full audio file (WAV, M4A, AAC, etc.) to a compressed
 * 128kbps VBR MP3 suitable for smooth full-track streaming.
 *
 * Unlike generateAudioPreview there is no -t (duration) limit —
 * the entire source is converted. Output is saved as
 * /uploads/vault-{vaultItemId}.mp3 and the public URL is returned.
 *
 * Encoding notes:
 *   -q:a 3  → libmp3lame VBR quality 3 (~165kbps average, excellent quality)
 *   -map_metadata -1  → strip embedded metadata to reduce file size
 *
 * A 4-minute 44.1kHz stereo WAV (~40 MB) compresses to roughly 4–5 MB.
 */
export async function compressAudioFile(
  audioFileUrl: string,
  vaultItemId: string,
): Promise<string | null> {
  if (!audioFileUrl || !audioFileUrl.startsWith("/uploads/")) return null;

  const inputPath = path.join(process.cwd(), audioFileUrl);
  if (!fs.existsSync(inputPath)) {
    console.warn(`[compress] source file not found: ${inputPath}`);
    return null;
  }

  const outputFilename = `vault-${vaultItemId}.mp3`;
  const outputPath = path.join(uploadsDir, outputFilename);

  const cmd = [
    "ffmpeg",
    `-i "${inputPath}"`,
    `-acodec libmp3lame`,
    `-q:a 3`,
    `-map_metadata -1`,
    `"${outputPath}"`,
    `-y`,
  ].join(" ");

  try {
    await execAsync(cmd);
    const inBytes  = fs.statSync(inputPath).size;
    const outBytes = fs.statSync(outputPath).size;
    const ratio    = ((1 - outBytes / inBytes) * 100).toFixed(0);
    console.log(
      `[compress] ${outputFilename} — ${(inBytes / 1e6).toFixed(1)} MB → ` +
      `${(outBytes / 1e6).toFixed(1)} MB (${ratio}% reduction)`,
    );
    return `/uploads/${outputFilename}`;
  } catch (err: any) {
    console.error(`[compress] ffmpeg failed for vault item ${vaultItemId}:`, err.stderr ?? err.message);
    return null;
  }
}

/**
 * Deletes the compressed file for a vault item if it exists.
 */
export function deleteCompressedAudio(vaultItemId: string): void {
  const filePath = path.join(uploadsDir, `vault-${vaultItemId}.mp3`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[compress] deleted vault-${vaultItemId}.mp3`);
  }
}
