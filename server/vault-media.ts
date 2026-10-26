import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { pool } from "./db";
import { hasValidAdminToken } from "./admin-auth";
import { getSessionSecret } from "./runtime-config";
import { mediaStorage } from "./media-storage";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEDIA_URL_RE = /^\/media\/assets\/([0-9a-f-]{36})(?:\?.*)?$/i;
const LEGACY_URL_RE = /^\/uploads\/([^/?#]+)(?:[?#].*)?$/i;
const SIGNED_ASSET_URL_RE = /^\/api\/vault\/media\/([0-9a-f-]{36})(?:\?.*)?$/i;
const SIGNED_LEGACY_URL_RE = /^\/api\/vault\/media\/legacy\/([^/?#]+)(?:[?#].*)?$/i;
const VAULT_MEDIA_URL_TTL_SECONDS = 12 * 60 * 60;
const PUBLIC_MEDIA_REFERENCE_SQL = `(
  EXISTS (
    SELECT 1 FROM releases
    WHERE cover_image=$1 OR audio_file_url=$1 OR audio_preview_url=$1
  )
  OR EXISTS (
    SELECT 1 FROM posts
    WHERE published='true'
      AND (cover_image=$1 OR music_url=$1 OR $1=ANY(images))
  )
  OR EXISTS (SELECT 1 FROM vanta_media WHERE type='image' AND url=$1)
  OR EXISTS (
    SELECT 1 FROM stonerism_authors WHERE avatar_url=$1
  )
  OR EXISTS (
    SELECT 1 FROM stonerism_series WHERE status='active' AND hero_image=$1
  )
  OR EXISTS (
    SELECT 1 FROM stonerism_content
    WHERE status='published' AND (hero_image=$1 OR $1=ANY(gallery))
  )
  OR EXISTS (
    SELECT 1 FROM stonerism_events
    WHERE status IN ('scheduled', 'completed') AND hero_image=$1
  )
  OR EXISTS (
    SELECT 1 FROM site_content
    WHERE hero_image_url=$1 OR studio_image_url=$1 OR city_image_url=$1
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles WHERE avatar_url=$1 OR banner_url=$1
  )
  OR EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE profile_image_url=$1 OR banner_image_url=$1
  )
  OR EXISTS (
    SELECT 1 FROM app_teasers WHERE published='true' AND teaser_image=$1
  )
)`;

type VaultMediaUpload = {
  bytes: Buffer;
  mimeType: string;
  originalFilename: string;
  ownerType?: string;
  ownerId?: string;
  purpose?: string;
  width?: number | null;
  height?: number | null;
};

export async function storeVaultMediaAsset(input: VaultMediaUpload): Promise<string> {
  const assetId = crypto.randomUUID();
  const ext = path.extname(input.originalFilename).toLowerCase();
  const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
  const now = new Date();
  const storageKey = [
    "vanta",
    "vault",
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${assetId}${safeExt}`,
  ].join("/");
  const checksum = crypto.createHash("sha256").update(input.bytes).digest("hex");

  await pool.query(
    `INSERT INTO media_assets (
       id, storage_key, owner_type, owner_id, namespace, purpose,
       original_filename, mime_type, byte_size, width, height,
       visibility, processing_status, checksum_sha256
     ) VALUES ($1, $2, $3, $4, 'vanta', $5, $6, $7, $8, $9, $10,
       'private', 'pending', $11)`,
    [
      assetId,
      storageKey,
      input.ownerType ?? null,
      input.ownerId ?? null,
      input.purpose ?? "vault_media",
      input.originalFilename,
      input.mimeType,
      input.bytes.length,
      input.width ?? null,
      input.height ?? null,
      checksum,
    ],
  );

  try {
    await mediaStorage.store({ key: storageKey, bytes: input.bytes });
    await pool.query(
      `UPDATE media_assets SET processing_status='ready', updated_at=NOW() WHERE id=$1`,
      [assetId],
    );
  } catch (error) {
    await pool.query(
      `UPDATE media_assets SET processing_status='failed', updated_at=NOW() WHERE id=$1`,
      [assetId],
    ).catch(() => undefined);
    throw error;
  }

  return `/media/assets/${assetId}`;
}

export async function deleteVaultCompressedMediaAssets(ownerId: string): Promise<void> {
  const result = await pool.query(
    `SELECT id, storage_key FROM media_assets
     WHERE owner_type='vault_item' AND owner_id=$1
       AND purpose='vault_audio_compressed' AND deleted_at IS NULL`,
    [ownerId],
  );
  for (const asset of result.rows) {
    await mediaStorage.delete(asset.storage_key);
    await pool.query(
      `UPDATE media_assets SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [asset.id],
    );
  }
}

function signature(resource: string, expiresAt: number): Buffer {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`${resource}:${expiresAt}`)
    .digest();
}

export function createVaultMediaAccessUrl(resourceUrl: string): string {
  resourceUrl = normalizeVaultMediaUrl(resourceUrl);
  const mediaMatch = resourceUrl.match(MEDIA_URL_RE);
  const legacyMatch = resourceUrl.match(LEGACY_URL_RE);
  let resource: string;
  let route: string;

  if (mediaMatch && UUID_RE.test(mediaMatch[1])) {
    resource = `asset:${mediaMatch[1].toLowerCase()}`;
    route = `/api/vault/media/${mediaMatch[1]}`;
  } else if (legacyMatch) {
    const filename = path.basename(legacyMatch[1]);
    if (filename !== legacyMatch[1] || filename === "." || filename === "..") return resourceUrl;
    resource = `legacy:${filename}`;
    route = `/api/vault/media/legacy/${encodeURIComponent(filename)}`;
  } else {
    return resourceUrl;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + VAULT_MEDIA_URL_TTL_SECONDS;
  const token = `${expiresAt}.${signature(resource, expiresAt).toString("hex")}`;
  return `${route}?access=${token}`;
}

export function normalizeVaultMediaUrl(value: string): string {
  const signedAssetMatch = value.match(SIGNED_ASSET_URL_RE);
  if (signedAssetMatch && UUID_RE.test(signedAssetMatch[1])) {
    return `/media/assets/${signedAssetMatch[1].toLowerCase()}`;
  }
  const signedLegacyMatch = value.match(SIGNED_LEGACY_URL_RE);
  if (signedLegacyMatch) {
    let filename: string;
    try {
      filename = decodeURIComponent(signedLegacyMatch[1]);
    } catch {
      return value;
    }
    if (path.basename(filename) === filename && filename !== "." && filename !== "..") {
      return `/uploads/${filename}`;
    }
  }
  const mediaMatch = value.match(MEDIA_URL_RE);
  if (mediaMatch && UUID_RE.test(mediaMatch[1])) {
    return `/media/assets/${mediaMatch[1].toLowerCase()}`;
  }
  const legacyMatch = value.match(LEGACY_URL_RE);
  if (legacyMatch) {
    const filename = path.basename(legacyMatch[1]);
    if (filename === legacyMatch[1] && filename !== "." && filename !== "..") {
      return `/uploads/${filename}`;
    }
  }
  return value;
}

export function protectVaultItemMedia<T extends {
  fileUrl?: string;
  compressedUrl?: string;
  coverImage?: string;
}>(item: T): T {
  return {
    ...item,
    fileUrl: item.fileUrl ? createVaultMediaAccessUrl(item.fileUrl) : item.fileUrl,
    compressedUrl: item.compressedUrl
      ? createVaultMediaAccessUrl(item.compressedUrl)
      : item.compressedUrl,
    coverImage: item.coverImage ? createVaultMediaAccessUrl(item.coverImage) : item.coverImage,
  };
}

export async function isVaultMediaAuthorized(
  req: Request,
  resource: string,
): Promise<boolean> {
  const access = typeof req.query.access === "string" ? req.query.access : "";
  const match = access.match(/^(\d{10})\.([0-9a-f]{64})$/i);
  if (match) {
    const expiresAt = Number(match[1]);
    if (expiresAt >= Math.floor(Date.now() / 1000)) {
      const expected = signature(resource, expiresAt);
      const presented = Buffer.from(match[2], "hex");
      if (presented.length === expected.length && crypto.timingSafeEqual(presented, expected)) {
        return true;
      }
    }
  }
  return req.session?.vaultAuthorized === true || await hasValidAdminToken(req);
}

export async function isVaultAssetReferenced(assetId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM media_assets
       WHERE id=$1 AND namespace='vanta'
         AND purpose IN ('vault_media', 'vault_audio_compressed')
         AND processing_status='ready' AND deleted_at IS NULL
     ) OR EXISTS (
       SELECT 1 FROM vault_items
       WHERE file_url=$2 OR compressed_url=$2 OR cover_image=$2
     ) AS referenced`,
    [assetId, `/media/assets/${assetId}`],
  );
  return result.rows[0]?.referenced === true;
}

export async function requiresVaultMediaAccess(
  assetId: string,
  visibility: string,
): Promise<boolean> {
  const url = `/media/assets/${assetId}`;
  const result = await pool.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM vault_items
         WHERE file_url=$1 OR compressed_url=$1 OR cover_image=$1
       ) AS referenced_by_vault,
       ${PUBLIC_MEDIA_REFERENCE_SQL} AS referenced_publicly`,
    [url],
  );
  const row = result.rows[0];
  const publicReference = row?.referenced_publicly === true;
  if (visibility === "private") return true;
  return !publicReference && row?.referenced_by_vault === true;
}

export async function getLegacyVaultUploadPolicy(url: string): Promise<{
  isVaultMedia: boolean;
  isStartupRadioMedia: boolean;
  isPublicReleaseMedia: boolean;
}> {
  const vaultResult = await pool.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM vault_items
         WHERE file_url=$1 OR compressed_url=$1 OR cover_image=$1
       ) AS is_vault_media,
       EXISTS (
         SELECT 1 FROM vault_items
         WHERE LOWER(TRIM(title))='degausser'
           AND type IN ('audio', 'demo')
           AND (file_url=$1 OR compressed_url=$1)
       ) AS is_startup_radio_media`,
    [url],
  );
  const row = vaultResult.rows[0];
  if (row?.is_vault_media !== true) {
    return {
      isVaultMedia: false,
      isStartupRadioMedia: false,
      isPublicReleaseMedia: false,
    };
  }
  const publicResult = await pool.query(
    `SELECT ${PUBLIC_MEDIA_REFERENCE_SQL} AS is_public_release_media`,
    [url],
  );
  return {
    isVaultMedia: row?.is_vault_media === true,
    isStartupRadioMedia: row?.is_startup_radio_media === true,
    isPublicReleaseMedia: publicResult.rows[0]?.is_public_release_media === true,
  };
}

export function getSafeLegacyUploadPath(filename: string): string | null {
  const safeName = path.basename(filename);
  if (safeName !== filename || safeName === "." || safeName === "..") return null;
  const root = path.resolve(process.cwd(), "uploads");
  const filePath = path.resolve(root, safeName);
  return filePath.startsWith(`${root}${path.sep}`) ? filePath : null;
}

export async function readVaultMediaSource(url: string): Promise<{
  bytes: Buffer;
  mimeType: string;
} | null> {
  const mediaMatch = url.match(MEDIA_URL_RE);
  if (mediaMatch && UUID_RE.test(mediaMatch[1])) {
    const result = await pool.query(
      `SELECT storage_key, mime_type
       FROM media_assets
       WHERE id=$1 AND processing_status='ready' AND deleted_at IS NULL
       LIMIT 1`,
      [mediaMatch[1]],
    );
    const asset = result.rows[0];
    if (!asset) return null;
    const bytes = await mediaStorage.read(asset.storage_key);
    return bytes ? { bytes, mimeType: asset.mime_type } : null;
  }

  const legacyMatch = url.match(LEGACY_URL_RE);
  if (!legacyMatch) return null;
  const filePath = getSafeLegacyUploadPath(legacyMatch[1]);
  if (!filePath || !fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".aac": "audio/aac", ".flac": "audio/flac", ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif",
  };
  return { bytes: await fs.promises.readFile(filePath), mimeType: mimeTypes[ext] ?? "application/octet-stream" };
}

export function sendVaultMediaBytes(
  req: Request,
  res: Response,
  bytes: Buffer,
  mimeType: string,
  options: { cacheControl?: string; etag?: string } = {},
): void {
  const size = bytes.length;
  const range = req.headers.range;
  const commonHeaders: Record<string, string> = {
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": options.cacheControl ?? "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (options.etag) commonHeaders.ETag = options.etag;

  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match || (!match[1] && !match[2])) {
      res.set(commonHeaders).set("Content-Range", `bytes */${size}`).status(416).end();
      return;
    }
    let start = match[1] ? Number(match[1]) : NaN;
    let end = match[2] ? Number(match[2]) : NaN;
    if (Number.isNaN(start)) {
      const suffixLength = end;
      if (suffixLength <= 0) {
        res.set(commonHeaders).set("Content-Range", `bytes */${size}`).status(416).end();
        return;
      }
      start = Math.max(0, size - suffixLength);
      end = size - 1;
    } else {
      if (Number.isNaN(end) || end >= size) end = size - 1;
    }
    if (start < 0 || start >= size || end < start) {
      res.set(commonHeaders).set("Content-Range", `bytes */${size}`).status(416).end();
      return;
    }
    res.status(206).set({
      ...commonHeaders,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    });
    if (req.method === "HEAD") return void res.end();
    return void res.end(bytes.subarray(start, end + 1));
  }

  res.status(200).set({ ...commonHeaders, "Content-Length": String(size) });
  if (req.method === "HEAD") return void res.end();
  return void res.end(bytes);
}
