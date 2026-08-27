import { generateIconResponse } from "@/lib/pwa-icon";

export const dynamic = "force-static";

export function GET() {
  return generateIconResponse(512);
}
