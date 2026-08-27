import { ImageResponse } from "next/og";
import { env } from "@/lib/env";

/**
 * Shared glyph generator for every app icon (favicon, apple-icon, PWA manifest icons).
 * `padding` leaves safe-zone margin for maskable icons, where OS shells crop/mask the image.
 * The glyph is the first letter of NEXT_PUBLIC_APP_NAME, so a new project shows its own
 * initial without editing this file.
 */
export function generateIconResponse(px: number, padding = 0) {
  const letter = env.NEXT_PUBLIC_APP_NAME.trim().charAt(0).toUpperCase() || "B";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ab4f27",
      }}
    >
      <span
        style={{
          display: "flex",
          width: px - padding * 2,
          height: px - padding * 2,
          alignItems: "center",
          justifyContent: "center",
          color: "#f8f3ea",
          fontSize: (px - padding * 2) * 0.6,
          fontWeight: 600,
          fontFamily: "Georgia, serif",
        }}
      >
        {letter}
      </span>
    </div>,
    { width: px, height: px },
  );
}
