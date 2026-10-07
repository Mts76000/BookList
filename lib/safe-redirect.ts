/**
 * Returns `value` only if it is a same-origin relative path, otherwise `fallback`.
 * Guards post-login redirects (`?redirectTo=`) against open redirects such as
 * `https://evil.com`, `//evil.com` or `/\evil.com` (browsers treat `\` like `/`).
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
