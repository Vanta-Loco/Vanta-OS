import { Client } from "@replit/object-storage";

export class MediaStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaStorageError";
  }
}

export type StoredMediaObject = {
  key: string;
  bytes: Buffer;
};

class MediaStorage {
  private readonly client = new Client();

  async ensureAvailable(): Promise<void> {
    try {
      const result = await this.client.list({ maxResults: 1 });
      if (!result.ok) {
        throw new MediaStorageError(result.error.message);
      }
    } catch {
      throw new MediaStorageError("The configured App Storage bucket is unavailable.");
    }
  }

  async store(object: StoredMediaObject): Promise<void> {
    try {
      const result = await this.client.uploadFromBytes(object.key, object.bytes, {
        compress: false,
      });
      if (!result.ok) {
        throw new MediaStorageError(result.error.message);
      }
    } catch (error) {
      if (error instanceof MediaStorageError) throw error;
      throw new MediaStorageError("App Storage rejected the media object.");
    }
  }

  async inspect(key: string): Promise<{ exists: boolean }> {
    try {
      const result = await this.client.exists(key);
      if (!result.ok) {
        throw new MediaStorageError(result.error.message);
      }
      return { exists: result.value };
    } catch (error) {
      if (error instanceof MediaStorageError) throw error;
      throw new MediaStorageError("App Storage could not inspect the media object.");
    }
  }

  async read(key: string): Promise<Buffer | null> {
    const inspected = await this.inspect(key);
    if (!inspected.exists) return null;
    try {
      const result = await this.client.downloadAsBytes(key, { decompress: false });
      if (!result.ok) {
        throw new MediaStorageError(result.error.message);
      }
      return Buffer.from(result.value[0]);
    } catch (error) {
      if (error instanceof MediaStorageError) throw error;
      throw new MediaStorageError("App Storage could not read the media object.");
    }
  }

  publicUrl(assetId: string): string {
    return `/media/assets/${assetId}`;
  }

  async delete(key: string): Promise<void> {
    try {
      const result = await this.client.delete(key, { ignoreNotFound: true });
      if (!result.ok) {
        throw new MediaStorageError(result.error.message);
      }
    } catch (error) {
      if (error instanceof MediaStorageError) throw error;
      throw new MediaStorageError("App Storage could not delete the media object.");
    }
  }
}

export const mediaStorage = new MediaStorage();