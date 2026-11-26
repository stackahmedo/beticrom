import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getEnv } from "../config/env.js";
import { hmacSha256Hex, sha256Hex } from "../utils/crypto.js";

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export function validateUploadFile(file: { name: string; type: string; size: number; buffer: Buffer }) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File size must be between 1 byte and ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MEDIA_MIME_TYPES.has(mime)) {
    throw new Error(`Unsupported file type: ${mime || "unknown"}`);
  }

  // Magic-byte verification for common raster images & PDF
  const head = file.buffer.subarray(0, 12);
  if (mime === "image/png" && !head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    throw new Error("File signature does not match PNG");
  }
  if (mime === "image/jpeg" && !(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) {
    throw new Error("File signature does not match JPEG");
  }
  if (mime === "application/pdf" && head.subarray(0, 4).toString("ascii") !== "%PDF") {
    throw new Error("File signature does not match PDF");
  }
}

export interface StoredFileResult {
  provider: "local" | "r2";
  storageKey: string;
  url: string;
}

export async function uploadMediaBuffer(params: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  folder?: string;
}): Promise<StoredFileResult> {
  const env = getEnv();
  const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = (params.folder || "general").replace(/[^a-zA-Z0-9_-]/g, "");
  const uniqueKey = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;

  if (
    env.MEDIA_STORAGE_PROVIDER === "r2" &&
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET
  ) {
    // AWS Signature V4 PUT to Cloudflare R2 S3-compatible endpoint
    const host = `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const url = `https://${host}/${env.R2_BUCKET}/${uniqueKey}`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(params.buffer);

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = `PUT\n/${env.R2_BUCKET}/${uniqueKey}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

    const kDate = crypto.createHmac("sha256", `AWS4${env.R2_SECRET_ACCESS_KEY}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update("auto").digest();
    const kService = crypto.createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = hmacSha256Hex(kSigning.toString("latin1"), stringToSign);
    const kSignHex = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
    void signature;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Host: host,
        "Content-Type": params.mimeType,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        Authorization: `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${kSignHex}`,
      },
      body: new Uint8Array(params.buffer),
    });

    if (!res.ok) {
      throw new Error(`Cloudflare R2 upload failed (${res.status})`);
    }

    const publicBase = env.R2_PUBLIC_BASE_URL.replace(/\/$/, "");
    return {
      provider: "r2",
      storageKey: uniqueKey,
      url: publicBase ? `${publicBase}/${uniqueKey}` : url,
    };
  }

  // Local validated disk storage
  const uploadsRoot = path.resolve(process.cwd(), ".local/uploads");
  const targetPath = path.join(uploadsRoot, uniqueKey);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, params.buffer);

  return {
    provider: "local",
    storageKey: uniqueKey,
    url: `/api/v1/media/files/${uniqueKey}`,
  };
}
