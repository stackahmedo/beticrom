import crypto from "node:crypto";
import { getEnv } from "../config/env.js";

/**
 * Hash a password using Node's native scrypt with a random 16-byte salt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

/**
 * Timing-safe password verification against stored scrypt hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hexKey] = parts;
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  const expected = Buffer.from(hexKey, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hmacSha256Hex(secret: string, payload: string | Buffer): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Encrypt sensitive fields (e.g. MFA TOTP secret) at rest using AES-256-GCM.
 */
export function encryptSecret(plaintext: string): string {
  const key = crypto.createHash("sha256").update(getEnv().MFA_ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptSecret(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(".");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted secret format");
  const key = crypto.createHash("sha256").update(getEnv().MFA_ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

// ─── RFC 6238 TOTP Helpers (zero external dependency) ────────────────────────
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += BASE32_ALPHABET[bytes[i] % 32];
  }
  return out;
}

function decodeBase32(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotpCode(base32Secret: string, timestampMs = Date.now(), stepSeconds = 30): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const key = decodeBase32(base32Secret);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function verifyTotpCode(base32Secret: string, token: string, window = 1): boolean {
  const normalized = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const now = Date.now();
  for (let offset = -window; offset <= window; offset++) {
    const candidate = generateTotpCode(base32Secret, now + offset * 30_000);
    if (timingSafeEqualHex(candidate, normalized)) return true;
  }
  return false;
}
