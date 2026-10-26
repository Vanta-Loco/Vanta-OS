import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import {
  deleteVaultCompressedMediaAssets,
  readVaultMediaSource,
  storeVaultMediaAsset,
} from "./vault-media";

const execFileAsync = promisify(execFile);
const uploadsDir = path.join(process.cwd(), "uploads");

/**
 * Converts a full audio file (WAV, M4A, AAC, etc.) to a compressed
 * 128kbps VBR MP3 suitable for smooth full-track streaming.
 *
 * Unlike generateAudioPreview there is no -t (duration) limit — the entire
 * source is converted. The compressed copy is stored as a private media asset.
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
  const source = await readVaultMediaSource(audioFileUrl);
  if (!source) {
    console.warn(`[compress] source file unavailable for vault item ${vaultItemId}`);
    return null;
  }
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vault-audio-"));
  const inputPath = path.join(tempDir, "source");
  const outputPath = path.join(tempDir, "compressed.mp3");
  try {
    await fs.promises.writeFile(inputPath, source.bytes);
    await execFileAsync("ffmpeg", [
      "-i", inputPath,
      "-acodec", "libmp3lame",
      "-q:a", "3",
      "-map_metadata", "-1",
      outputPath,
      "-y",
    ]);
    const output = await fs.promises.readFile(outputPath);
    const outputUrl = await storeVaultMediaAsset({
      bytes: output,
      mimeType: "audio/mpeg",
      originalFilename: `vault-${vaultItemId}.mp3`,
      ownerType: "vault_item",
      ownerId: vaultItemId,
      purpose: "vault_audio_compressed",
    });
    const ratio = ((1 - output.length / source.bytes.length) * 100).toFixed(0);
    console.log(
      `[compress] vault item ${vaultItemId} — ${(source.bytes.length / 1e6).toFixed(1)} MB → ` +
      `${(output.length / 1e6).toFixed(1)} MB (${ratio}% reduction)`,
    );
    return outputUrl;
  } catch (err: any) {
    console.error(`[compress] ffmpeg failed for vault item ${vaultItemId}:`, err.stderr ?? err.message);
    return null;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Deletes the compressed file for a vault item if it exists.
 */
export async function deleteCompressedAudio(vaultItemId: string): Promise<void> {
  const filePath = path.join(uploadsDir, `vault-${vaultItemId}.mp3`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[compress] deleted vault-${vaultItemId}.mp3`);
  }
  await deleteVaultCompressedMediaAssets(vaultItemId);
}
