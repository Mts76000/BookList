import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Generic HMAC-SHA256 webhook signature verification, provider-agnostic. Not wired to any
 * specific provider by default — a future integration (Resend events, Stripe, etc.) plugs
 * its own secret and header name in when needed.
 *
 * @param payload Raw request body (must be the exact bytes that were signed).
 * @param signature Signature value read from the provider's webhook header.
 * @param secret Shared webhook signing secret for that provider.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
