import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import sharp from "sharp";
import type { PoolClient } from "@neondatabase/serverless";
import { pool } from "./db";
import { mediaStorage } from "./media-storage";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "media-migration-manifests",
  "p0-c2-legacy-public-media.json",
);
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const MAX_LEGACY_IMAGE_PIXELS = 100_000_000;

type ReferenceKind = "scalar" | "array";
type ReferenceScope =
  | "public-image"
  | "image"
  | "typed-media"
  | "excluded-audio"
  | "excluded-restricted";

type ReferenceConfig = {
  table: string;
  idColumn: string;
  column: string;
  kind: ReferenceKind;
  scope: ReferenceScope;
  publicPredicate?: string;
};

type DatabaseReference = {
  table: string;
  column: string;
  rowId: string;
  arrayIndex: number | null;
  scope: ReferenceScope;
  vantaMediaType: string | null;
  publiclyEligible: boolean;
};

type ManifestEntry = {
  localPath: string;
  legacyUrl: string;
  byteSize: number | null;
  checksumSha256: string | null;
  classification: "image" | "audio" | "unknown" | "missing";
  mimeType: string;
  format: string | null;
  width: number | null;
  height: number | null;
  databaseReferences: DatabaseReference[];
  migrationStatus:
    | "eligible"
    | "migrated"
    | "failed"
    | "skipped"
    | "orphaned"
    | "audio_deliberately_excluded"
    | "unknown"
    | "missing";
  mediaAssetId: string | null;
  stableUrl: string | null;
  referencesUpdated: number;
  error: string | null;
};

type Manifest = {
  version: 1;
  stage: "P0-C2";
  generatedAt: string;
  updatedAt: string;
  lastMode: "dry-run" | "apply";
  backup: {
    path: string;
    temporary: true;
    byteSize: number;
    catalogEntries: number;
    verifiedAt: string;
  } | null;
  summary: ReturnType<typeof summarize>;
  entries: ManifestEntry[];
};

const REFERENCE_CONFIGS: ReferenceConfig[] = [
  { table: "posts", idColumn: "id", column: "cover_image", kind: "scalar", scope: "public-image", publicPredicate: "published='true'" },
  { table: "posts", idColumn: "id", column: "images", kind: "array", scope: "public-image", publicPredicate: "published='true'" },
  { table: "releases", idColumn: "id", column: "cover_image", kind: "scalar", scope: "public-image" },
  { table: "vault_items", idColumn: "id", column: "cover_image", kind: "scalar", scope: "excluded-restricted", publicPredicate: "FALSE" },
  { table: "vanta_media", idColumn: "id", column: "url", kind: "scalar", scope: "typed-media" },
  { table: "stonerism_authors", idColumn: "id", column: "avatar_url", kind: "scalar", scope: "public-image" },
  { table: "stonerism_series", idColumn: "id", column: "hero_image", kind: "scalar", scope: "public-image", publicPredicate: "status='active'" },
  { table: "stonerism_content", idColumn: "id", column: "hero_image", kind: "scalar", scope: "public-image", publicPredicate: "status='published'" },
  { table: "stonerism_content", idColumn: "id", column: "gallery", kind: "array", scope: "public-image", publicPredicate: "status='published'" },
  { table: "stonerism_entities", idColumn: "id", column: "hero_image", kind: "scalar", scope: "excluded-restricted", publicPredicate: "FALSE" },
  { table: "stonerism_entities", idColumn: "id", column: "gallery", kind: "array", scope: "excluded-restricted", publicPredicate: "FALSE" },
  { table: "stonerism_events", idColumn: "id", column: "hero_image", kind: "scalar", scope: "public-image", publicPredicate: "status IN ('scheduled', 'completed')" },
  { table: "site_content", idColumn: "id", column: "hero_image_url", kind: "scalar", scope: "public-image" },
  { table: "site_content", idColumn: "id", column: "studio_image_url", kind: "scalar", scope: "public-image" },
  { table: "site_content", idColumn: "id", column: "city_image_url", kind: "scalar", scope: "public-image" },
  { table: "user_profiles", idColumn: "id", column: "avatar_url", kind: "scalar", scope: "public-image" },
  { table: "user_profiles", idColumn: "id", column: "banner_url", kind: "scalar", scope: "public-image" },
  { table: "creator_profiles", idColumn: "id", column: "profile_image_url", kind: "scalar", scope: "public-image" },
  { table: "creator_profiles", idColumn: "id", column: "banner_image_url", kind: "scalar", scope: "public-image" },
  { table: "world_settings", idColumn: "id", column: "featured_image", kind: "scalar", scope: "public-image" },
  { table: "dev_logs", idColumn: "id", column: "cover_image", kind: "scalar", scope: "excluded-restricted", publicPredicate: "FALSE" },
  { table: "app_teasers", idColumn: "id", column: "teaser_image", kind: "scalar", scope: "public-image" },
  { table: "creator_work_items", idColumn: "id", column: "thumbnail_url", kind: "scalar", scope: "excluded-restricted", publicPredicate: "FALSE" },
  { table: "rooms", idColumn: "id", column: "thumbnail_url", kind: "scalar", scope: "public-image", publicPredicate: "visibility='public'" },
  { table: "releases", idColumn: "id", column: "audio_file_url", kind: "scalar", scope: "excluded-audio" },
  { table: "releases", idColumn: "id", column: "audio_preview_url", kind: "scalar", scope: "excluded-audio" },
  { table: "vault_items", idColumn: "id", column: "file_url", kind: "scalar", scope: "excluded-audio" },
  { table: "vault_items", idColumn: "id", column: "compressed_url", kind: "scalar", scope: "excluded-audio" },
  { table: "posts", idColumn: "id", column: "music_url", kind: "scalar", scope: "excluded-audio" },
];

const CONFIG_BY_FIELD = new Map(
  REFERENCE_CONFIGS.map(config => [`${config.table}.${config.column}`, config]),
);

function isEligibleReference(reference: DatabaseReference): boolean {
  if (
    !reference.publiclyEligible
    || reference.scope === "excluded-audio"
    || reference.scope === "excluded-restricted"
  ) return false;
  return reference.scope !== "typed-media" || reference.vantaMediaType === "image";
}

function walkFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return entry.isFile() ? [fullPath] : [];
  });
}

function mimeForImageFormat(format: string): string {
  return `image/${format === "jpg" ? "jpeg" : format}`;
}

async function classifyFile(fullPath: string) {
  const bytes = fs.readFileSync(fullPath);
  const checksumSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  try {
    const metadata = await sharp(bytes, {
      failOn: "error",
      limitInputPixels: MAX_LEGACY_IMAGE_PIXELS,
    }).metadata();
    if (metadata.format && metadata.width && metadata.height) {
      return {
        bytes,
        byteSize: bytes.length,
        checksumSha256,
        classification: "image" as const,
        mimeType: mimeForImageFormat(metadata.format),
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      };
    }
  } catch {
    // Non-images are classified by their detected MIME type below.
  }

  let mimeType = "application/octet-stream";
  try {
    mimeType = execFileSync("file", ["--brief", "--mime-type", fullPath], {
      encoding: "utf8",
    }).trim();
  } catch {
    // Unknown files remain excluded.
  }
  const audioLike = mimeType.startsWith("audio/")
    || (mimeType === "video/mp4" && /\.(m4a|mp4)$/i.test(fullPath));
  return {
    bytes,
    byteSize: bytes.length,
    checksumSha256,
    classification: audioLike ? "audio" as const : "unknown" as const,
    mimeType,
    format: null,
    width: null,
    height: null,
  };
}

async function findDatabaseReferences(): Promise<DatabaseReference[]> {
  const columns = await pool.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema='public'`,
  );
  const existing = new Set(
    columns.rows.map(row => `${row.table_name}.${row.column_name}`),
  );
  const references: DatabaseReference[] = [];

  for (const config of REFERENCE_CONFIGS) {
    if (
      !existing.has(`${config.table}.${config.idColumn}`)
      || !existing.has(`${config.table}.${config.column}`)
    ) {
      continue;
    }
    const extraColumn = config.table === "vanta_media" ? ", type" : "";
    const publicExpression = config.publicPredicate ?? "TRUE";
    const result = await pool.query(
      `SELECT ${config.idColumn} AS row_id, ${config.column} AS value${extraColumn},
              (${publicExpression}) AS publicly_eligible
       FROM ${config.table}`,
    );
    for (const row of result.rows) {
      const values: unknown[] = config.kind === "array"
        ? (Array.isArray(row.value) ? row.value : [])
        : [row.value];
      values.forEach((value: unknown, arrayIndex: number) => {
        if (typeof value !== "string" || !value.startsWith("/uploads/")) return;
        references.push({
          table: config.table,
          column: config.column,
          rowId: String(row.row_id),
          arrayIndex: config.kind === "array" ? arrayIndex : null,
          scope: config.scope,
          vantaMediaType: typeof row.type === "string" ? row.type : null,
          publiclyEligible: row.publicly_eligible === true,
        });
      });
    }
  }
  return references;
}

function loadPreviousManifest(): Manifest | null {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  return parsed.version === 1 && parsed.stage === "P0-C2" ? parsed : null;
}

async function hydrateReferenceEligibility(
  reference: DatabaseReference,
): Promise<DatabaseReference> {
  if (typeof reference.publiclyEligible === "boolean") return reference;
  const config = CONFIG_BY_FIELD.get(`${reference.table}.${reference.column}`);
  if (!config) return { ...reference, publiclyEligible: false };
  const publicExpression = config.publicPredicate ?? "TRUE";
  const result = await pool.query(
    `SELECT (${publicExpression}) AS publicly_eligible
     FROM ${config.table}
     WHERE ${config.idColumn}=$1`,
    [reference.rowId],
  );
  return {
    ...reference,
    publiclyEligible: result.rows[0]?.publicly_eligible === true,
  };
}

function referenceKey(reference: DatabaseReference): string {
  return [
    reference.table,
    reference.column,
    reference.rowId,
    reference.arrayIndex ?? "scalar",
  ].join(":");
}

function verifyBackup(backupPath: string) {
  const absolutePath = path.resolve(backupPath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    throw new Error("The required PostgreSQL backup file does not exist.");
  }
  const contents = execFileSync("pg_restore", ["--list", absolutePath], {
    encoding: "utf8",
  });
  const catalogEntries = contents
    .split("\n")
    .filter(line => /^\d+;/.test(line))
    .length;
  if (catalogEntries === 0) {
    throw new Error("The PostgreSQL backup could not be verified.");
  }
  return {
    path: absolutePath,
    temporary: true as const,
    byteSize: fs.statSync(absolutePath).size,
    catalogEntries,
    verifiedAt: new Date().toISOString(),
  };
}

function summarize(entries: ManifestEntry[]) {
  return {
    legacyFilesScanned: entries.filter(entry => entry.classification !== "missing").length,
    eligiblePublicImages: entries.filter(entry =>
      entry.migrationStatus === "eligible"
      || entry.migrationStatus === "migrated"
      || entry.migrationStatus === "failed"
    ).length,
    successfullyMigrated: entries.filter(entry => entry.migrationStatus === "migrated").length,
    skipped: entries.filter(entry => entry.migrationStatus === "skipped").length,
    failed: entries.filter(entry => entry.migrationStatus === "failed").length,
    orphanImages: entries.filter(entry =>
      entry.migrationStatus === "orphaned" && entry.classification === "image"
    ).length,
    audioDeliberatelyExcluded: entries.filter(entry => entry.classification === "audio").length,
    unknownFiles: entries.filter(entry => entry.classification === "unknown").length,
    missingFiles: entries.filter(entry => entry.classification === "missing").length,
    databaseReferencesUpdated: entries.reduce(
      (total, entry) => total + entry.referencesUpdated,
      0,
    ),
  };
}

function saveManifest(manifest: Manifest): void {
  manifest.updatedAt = new Date().toISOString();
  manifest.summary = summarize(manifest.entries);
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function buildManifest(
  mode: "dry-run" | "apply",
  backup: Manifest["backup"],
): Promise<Manifest> {
  const previous = loadPreviousManifest();
  const previousByUrl = new Map(
    previous?.entries.map(entry => [entry.legacyUrl, entry]) ?? [],
  );
  const currentReferences = await findDatabaseReferences();
  const referencesByUrl = new Map<string, DatabaseReference[]>();
  for (const reference of currentReferences) {
    const config = CONFIG_BY_FIELD.get(`${reference.table}.${reference.column}`);
    if (!config) continue;
    const result = await pool.query(
      config.kind === "scalar"
        ? `SELECT ${config.column} AS value FROM ${config.table} WHERE ${config.idColumn}=$1`
        : `SELECT ${config.column} AS value FROM ${config.table} WHERE ${config.idColumn}=$1`,
      [reference.rowId],
    );
    const value = result.rows[0]?.value;
    const legacyUrl = config.kind === "array"
      ? value?.[reference.arrayIndex ?? -1]
      : value;
    if (typeof legacyUrl !== "string" || !legacyUrl.startsWith("/uploads/")) continue;
    const grouped = referencesByUrl.get(legacyUrl) ?? [];
    grouped.push(reference);
    referencesByUrl.set(legacyUrl, grouped);
  }

  const entries: ManifestEntry[] = [];
  const seenUrls = new Set<string>();
  for (const fullPath of walkFiles(UPLOADS_ROOT)) {
    const relativePath = path.relative(UPLOADS_ROOT, fullPath).split(path.sep).join("/");
    const legacyUrl = `/uploads/${relativePath}`;
    seenUrls.add(legacyUrl);
    const classified = await classifyFile(fullPath);
    const prior = previousByUrl.get(legacyUrl);
    const current = referencesByUrl.get(legacyUrl) ?? [];
    const mergedReferences = new Map<string, DatabaseReference>();
    for (const reference of prior?.databaseReferences ?? []) {
      const hydrated = await hydrateReferenceEligibility(reference);
      mergedReferences.set(referenceKey(hydrated), hydrated);
    }
    for (const reference of current) {
      mergedReferences.set(referenceKey(reference), reference);
    }
    const databaseReferences = Array.from(mergedReferences.values());
    const eligibleReferences = databaseReferences.filter(isEligibleReference);
    const currentEligibleReferences = current.filter(isEligibleReference);
    let migrationStatus: ManifestEntry["migrationStatus"];
    if (classified.classification === "unknown") migrationStatus = "unknown";
    else if (classified.classification === "audio") migrationStatus = "audio_deliberately_excluded";
    else if (current.length > 0) {
      migrationStatus = currentEligibleReferences.length > 0 ? "eligible" : "skipped";
    } else if (prior?.migrationStatus === "migrated") migrationStatus = "migrated";
    else if (!databaseReferences.length) migrationStatus = "orphaned";
    else if (!eligibleReferences.length) migrationStatus = "skipped";
    else migrationStatus = "eligible";

    entries.push({
      localPath: path.relative(process.cwd(), fullPath).split(path.sep).join("/"),
      legacyUrl,
      byteSize: classified.byteSize,
      checksumSha256: classified.checksumSha256,
      classification: classified.classification,
      mimeType: classified.mimeType,
      format: classified.format,
      width: classified.width,
      height: classified.height,
      databaseReferences,
      migrationStatus,
      mediaAssetId: prior?.mediaAssetId
        ?? (migrationStatus === "eligible" ? crypto.randomUUID() : null),
      stableUrl: prior?.stableUrl ?? null,
      referencesUpdated: prior?.referencesUpdated ?? 0,
      error: prior?.migrationStatus === "failed" ? prior.error : null,
    });
  }

  referencesByUrl.forEach((references, legacyUrl) => {
    if (seenUrls.has(legacyUrl)) return;
    const prior = previousByUrl.get(legacyUrl);
    entries.push({
      localPath: legacyUrl.replace(/^\/+/, ""),
      legacyUrl,
      byteSize: null,
      checksumSha256: null,
      classification: "missing",
      mimeType: "application/octet-stream",
      format: null,
      width: null,
      height: null,
      databaseReferences: references,
      migrationStatus: prior?.migrationStatus === "migrated" ? "migrated" : "missing",
      mediaAssetId: prior?.mediaAssetId ?? null,
      stableUrl: prior?.stableUrl ?? null,
      referencesUpdated: prior?.referencesUpdated ?? 0,
      error: "Referenced local file does not exist.",
    });
  });

  return {
    version: 1,
    stage: "P0-C2",
    generatedAt: previous?.generatedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMode: mode,
    backup: backup ?? previous?.backup ?? null,
    summary: summarize(entries),
    entries,
  };
}

async function referenceAlreadyUpdated(
  client: PoolClient,
  reference: DatabaseReference,
  stableUrl: string,
): Promise<boolean> {
  const config = CONFIG_BY_FIELD.get(`${reference.table}.${reference.column}`);
  if (!config) throw new Error("Reference field is not allowlisted.");
  const result = await client.query(
    `SELECT ${config.column} AS value
     FROM ${config.table}
     WHERE ${config.idColumn}=$1`,
    [reference.rowId],
  );
  const value = result.rows[0]?.value;
  return config.kind === "array"
    ? value?.[reference.arrayIndex ?? -1] === stableUrl
    : value === stableUrl;
}

async function updateReference(
  client: PoolClient,
  reference: DatabaseReference,
  oldUrl: string,
  stableUrl: string,
): Promise<boolean> {
  const config = CONFIG_BY_FIELD.get(`${reference.table}.${reference.column}`);
  if (!config) throw new Error("Reference field is not allowlisted.");
  if (config.kind === "scalar") {
    const result = await client.query(
      `UPDATE ${config.table}
       SET ${config.column}=$1
       WHERE ${config.idColumn}=$2 AND ${config.column}=$3`,
      [stableUrl, reference.rowId, oldUrl],
    );
    if (result.rowCount === 1) return true;
  } else {
    if (reference.arrayIndex === null) throw new Error("Array reference has no index.");
    const postgresIndex = reference.arrayIndex + 1;
    const result = await client.query(
      `UPDATE ${config.table}
       SET ${config.column}[$1]= $2
       WHERE ${config.idColumn}=$3 AND ${config.column}[$1]=$4`,
      [postgresIndex, stableUrl, reference.rowId, oldUrl],
    );
    if (result.rowCount === 1) return true;
  }
  if (await referenceAlreadyUpdated(client, reference, stableUrl)) return false;
  throw new Error(`Reference changed before migration: ${reference.table}.${reference.column}`);
}

async function migrateEntry(entry: ManifestEntry): Promise<void> {
  if (
    !entry.mediaAssetId
    || !entry.checksumSha256
    || !entry.format
    || !entry.width
    || !entry.height
    || entry.byteSize === null
  ) {
    throw new Error("Eligible image metadata is incomplete.");
  }
  const fullPath = path.join(process.cwd(), entry.localPath);
  const classified = await classifyFile(fullPath);
  if (
    classified.classification !== "image"
    || classified.checksumSha256 !== entry.checksumSha256
    || classified.byteSize !== entry.byteSize
  ) {
    throw new Error("Legacy file changed after inventory.");
  }

  const extension = entry.format === "jpeg" ? "jpg" : entry.format;
  const storageKey = `vanta/legacy-public/${entry.mediaAssetId}.${extension}`;
  const stableUrl = mediaStorage.publicUrl(entry.mediaAssetId);
  const existing = await pool.query(
    `SELECT storage_key, checksum_sha256, processing_status, deleted_at
     FROM media_assets WHERE id=$1`,
    [entry.mediaAssetId],
  );
  const existingAsset = existing.rows[0];
  if (existingAsset) {
    if (
      existingAsset.storage_key !== storageKey
      || existingAsset.checksum_sha256 !== entry.checksumSha256
      || existingAsset.processing_status !== "ready"
      || existingAsset.deleted_at !== null
    ) {
      throw new Error("Existing Media Asset metadata does not match the manifest.");
    }
  } else {
    await mediaStorage.store({ key: storageKey, bytes: classified.bytes });
  }

  const inspected = await mediaStorage.inspect(storageKey);
  if (!inspected.exists) throw new Error("Stored object is missing after copy.");
  const storedBytes = await mediaStorage.read(storageKey);
  if (
    !storedBytes
    || storedBytes.length !== entry.byteSize
    || crypto.createHash("sha256").update(storedBytes).digest("hex") !== entry.checksumSha256
  ) {
    throw new Error("Stored object integrity verification failed.");
  }

  const client = await pool.connect();
  let referencesUpdated = 0;
  try {
    await client.query("BEGIN");
    if (!existingAsset) {
      await client.query(
        `INSERT INTO media_assets (
           id, storage_key, namespace, purpose, original_filename, mime_type,
           byte_size, width, height, visibility, processing_status, checksum_sha256
         ) VALUES (
           $1, $2, 'vanta', 'legacy_public_image', $3, $4,
           $5, $6, $7, 'public', 'ready', $8
         )`,
        [
          entry.mediaAssetId,
          storageKey,
          path.basename(entry.localPath),
          entry.mimeType,
          entry.byteSize,
          entry.width,
          entry.height,
          entry.checksumSha256,
        ],
      );
    }
    for (const reference of entry.databaseReferences.filter(isEligibleReference)) {
      if (await updateReference(client, reference, entry.legacyUrl, stableUrl)) {
        referencesUpdated += 1;
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  entry.stableUrl = stableUrl;
  entry.referencesUpdated += referencesUpdated;
  entry.migrationStatus = "migrated";
  entry.error = null;
}

async function run() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run") || !apply;
  if (apply && process.argv.includes("--dry-run")) {
    throw new Error("Choose either --dry-run or --apply.");
  }
  const mode = dryRun ? "dry-run" : "apply";
  const backupFlagIndex = process.argv.indexOf("--backup");
  const backupPath = backupFlagIndex >= 0 ? process.argv[backupFlagIndex + 1] : null;
  if (apply && !backupPath) {
    throw new Error("Apply mode requires --backup <verified-pg-dump-path>.");
  }
  const backup = backupPath ? verifyBackup(backupPath) : null;
  const manifest = await buildManifest(mode, backup);
  saveManifest(manifest);

  if (apply) {
    for (const entry of manifest.entries) {
      if (entry.migrationStatus !== "eligible" && entry.migrationStatus !== "failed") continue;
      try {
        await migrateEntry(entry);
        console.log(`Migrated ${entry.legacyUrl} -> ${entry.stableUrl}`);
      } catch (error) {
        entry.migrationStatus = "failed";
        entry.error = error instanceof Error ? error.message : "Unknown migration failure";
        console.error(`Failed ${entry.legacyUrl}: ${entry.error}`);
      }
      saveManifest(manifest);
    }
  }

  saveManifest(manifest);
  console.log(JSON.stringify({
    mode,
    manifest: path.relative(process.cwd(), MANIFEST_PATH),
    ...manifest.summary,
  }, null, 2));
  if (manifest.summary.failed > 0 || manifest.summary.missingFiles > 0) {
    process.exitCode = 1;
  }
}

run()
  .catch(error => {
    console.error(error instanceof Error ? error.message : "Legacy media migration failed.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());