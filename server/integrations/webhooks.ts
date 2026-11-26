import { hmacSha256Hex, timingSafeEqualHex } from "../utils/crypto.js";

/**
 * Verifies Stripe-style or generic HMAC-SHA256 webhook signatures with replay timestamp tolerance.
 * Header format supported: `t=<unix_sec>,v1=<hex_sig>` OR raw `<hex_sig>` with `X-Webhook-Timestamp`.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | undefined;
  timestampHeader?: string | undefined;
  secret: string;
  toleranceSeconds?: number;
}): { valid: boolean; reason?: string } {
  const { rawBody, signatureHeader, timestampHeader, secret, toleranceSeconds = 300 } = params;
  if (!secret) {
    return { valid: false, reason: "Webhook secret is not configured on server" };
  }
  if (!signatureHeader) {
    return { valid: false, reason: "Missing webhook signature header" };
  }

  let timestampSec: number | null = null;
  let sigHex = signatureHeader.trim();

  if (signatureHeader.includes("v1=")) {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((kv) => {
        const [k, v] = kv.trim().split("=");
        return [k, v];
      })
    );
    timestampSec = parts.t ? Number(parts.t) : null;
    sigHex = parts.v1 || "";
  } else if (timestampHeader) {
    timestampSec = Number(timestampHeader);
  }

  if (timestampSec !== null) {
    if (!Number.isFinite(timestampSec)) {
      return { valid: false, reason: "Invalid webhook timestamp" };
    }
    const ageSec = Math.abs(Math.floor(Date.now() / 1000) - timestampSec);
    if (ageSec > toleranceSeconds) {
      return { valid: false, reason: "Webhook timestamp outside tolerance window (possible replay)" };
    }
  }

  const signedPayload = timestampSec !== null ? `${timestampSec}.${rawBody}` : rawBody;
  const expected = hmacSha256Hex(secret, signedPayload);

  if (!timingSafeEqualHex(expected, sigHex.toLowerCase())) {
    return { valid: false, reason: "Signature mismatch" };
  }

  return { valid: true };
}
