import { generateIconResponse } from "@/lib/pwa-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// No transparency and no rounded corners: iOS applies its own mask automatically over a
// full-bleed square, per Apple's touch icon guidelines.
export default function AppleIcon() {
  return generateIconResponse(180);
}
