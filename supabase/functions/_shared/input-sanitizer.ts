/**
 * Input sanitization utilities for edge functions.
 * Validates and cleans user-provided data before processing.
 */

/** Sanitize a string: trim, enforce max length, strip control characters */
export function sanitizeString(
  value: unknown,
  maxLength: number = 500
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  // Strip control characters except newline/tab
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return cleaned.slice(0, maxLength) || null;
}

/** Validate and sanitize an email */
export function sanitizeEmail(value: unknown): string | null {
  const str = sanitizeString(value, 255);
  if (!str) return null;
  // Basic email pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) ? str.toLowerCase() : null;
}

/** Validate and sanitize a UUID */
export function sanitizeUUID(value: unknown): string | null {
  const str = sanitizeString(value, 36);
  if (!str) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str.toLowerCase() : null;
}

/** Validate a number within range */
export function sanitizeNumber(
  value: unknown,
  min: number = -1_000_000,
  max: number = 1_000_000
): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < min || num > max) return null;
  return num;
}

/** Validate a positive number */
export function sanitizePositiveNumber(value: unknown, max: number = 1_000_000): number | null {
  return sanitizeNumber(value, 0, max);
}

/** Sanitize a zip code (US format) */
export function sanitizeZipCode(value: unknown): string | null {
  const str = sanitizeString(value, 10);
  if (!str) return null;
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(str) ? str : null;
}

/** Sanitize a referral code */
export function sanitizeReferralCode(value: unknown): string | null {
  const str = sanitizeString(value, 20);
  if (!str) return null;
  // Allow alphanumeric + hyphens only
  const codeRegex = /^[A-Za-z0-9\-]+$/;
  return codeRegex.test(str) ? str.toUpperCase() : null;
}

/** Sanitize a Stripe price ID */
export function sanitizePriceId(value: unknown): string | null {
  const str = sanitizeString(value, 100);
  if (!str) return null;
  // Stripe price IDs start with price_
  const priceRegex = /^price_[A-Za-z0-9]+$/;
  return priceRegex.test(str) ? str : null;
}

/** Validate latitude */
export function sanitizeLat(value: unknown): number | null {
  return sanitizeNumber(value, -90, 90);
}

/** Validate longitude */
export function sanitizeLng(value: unknown): number | null {
  return sanitizeNumber(value, -180, 180);
}

/** Sanitize a base64 image string (enforce max size ~10MB) */
export function sanitizeBase64Image(value: unknown, maxSizeBytes: number = 10_000_000): string | null {
  if (typeof value !== "string") return null;
  // Check approximate decoded size (base64 is ~4/3 of original)
  const estimatedSize = (value.length * 3) / 4;
  if (estimatedSize > maxSizeBytes) return null;
  // Basic base64 validation
  const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
  return base64Regex.test(value) ? value : null;
}

/** Sanitize an array with a max length */
export function sanitizeArray<T>(
  value: unknown,
  maxItems: number = 100,
  itemSanitizer?: (item: unknown) => T | null
): T[] | null {
  if (!Array.isArray(value)) return null;
  const sliced = value.slice(0, maxItems);
  if (itemSanitizer) {
    const sanitized = sliced.map(itemSanitizer).filter((v): v is T => v !== null);
    return sanitized.length > 0 ? sanitized : null;
  }
  return sliced as T[];
}

/** Build a 400 error response for invalid input */
export function invalidInputResponse(
  field: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: `Invalid or missing input: ${field}` }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
