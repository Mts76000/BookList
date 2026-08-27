import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

export interface StorageProvider {
  /** Uploads a file and returns its storage key. Validates real MIME type and size. */
  upload(file: Buffer, options: { filename: string; maxSizeBytes?: number }): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/**
 * Local filesystem storage for development. Swap for an S3-compatible provider
 * implementing the same StorageProvider interface in production — no other code changes.
 */
export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly uploadDir = path.join(process.cwd(), "public", "uploads"),
    private readonly publicPath = "/uploads",
  ) {}

  async upload(
    file: Buffer,
    options: { filename: string; maxSizeBytes?: number },
  ): Promise<string> {
    const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    if (file.byteLength > maxSize) {
      throw new Error(`File exceeds max size of ${maxSize} bytes.`);
    }

    // Never trust the client-provided filename/MIME: sniff the actual file content.
    const detected = await fileTypeFromBuffer(file);
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new Error("File type not allowed or could not be determined from its content.");
    }

    await mkdir(this.uploadDir, { recursive: true });
    const key = `${randomUUID()}.${detected.ext}`;
    await writeFile(path.join(this.uploadDir, key), file);

    return key;
  }

  async delete(key: string): Promise<void> {
    await unlink(path.join(this.uploadDir, key)).catch(() => {
      // Already gone — deleting is idempotent.
    });
  }

  getUrl(key: string): string {
    return `${this.publicPath}/${key}`;
  }
}

export const storage: StorageProvider = new LocalStorageProvider();
