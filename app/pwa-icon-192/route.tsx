import { generateIconResponse } from "@/lib/pwa-icon";

// Stable-URL PWA icon (referenced by app/manifest.ts) — separate from app/icon.tsx, whose
// generated route URL is hashed and not suitable for a manifest that needs a fixed path.
export const dynamic = "force-static";

export function GET() {
  return generateIconResponse(192);
}
