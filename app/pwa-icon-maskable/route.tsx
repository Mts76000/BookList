import { generateIconResponse } from "@/lib/pwa-icon";

// Padding keeps the glyph inside the ~80% "safe zone" Android uses for maskable icons, so
// it doesn't get clipped when the OS applies a circle/squircle/rounded-square mask.
export const dynamic = "force-static";

export function GET() {
  return generateIconResponse(512, 51);
}
