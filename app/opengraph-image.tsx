import { ImageResponse } from "next/og";
import { getLogoMark } from "@/lib/pwa-icon";
import { env } from "@/lib/env";
import { APP_DESCRIPTION } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BookList — votre suivi de lecture personnel";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#f8f3ea",
        padding: "0 96px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
        <img src={getLogoMark()} width={128} height={83} alt="" style={{ marginBottom: 28 }} />
        <div style={{ display: "flex", fontSize: 72, fontWeight: 600, color: "#241d15" }}>
          {env.NEXT_PUBLIC_APP_NAME}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 30,
            color: "#6b5d49",
            lineHeight: 1.4,
          }}
        >
          {APP_DESCRIPTION}
        </div>
      </div>
      {/* Trois tranches de livres alignées sur la palette : encre, terracotta, moss. */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginLeft: "auto" }}>
        <div
          style={{
            display: "flex",
            width: 64,
            height: 300,
            borderRadius: 14,
            background: "#332e23",
          }}
        />
        <div
          style={{
            display: "flex",
            width: 64,
            height: 380,
            borderRadius: 14,
            background: "#ab4f27",
          }}
        />
        <div
          style={{
            display: "flex",
            width: 64,
            height: 240,
            borderRadius: 14,
            background: "#4f6a41",
          }}
        />
      </div>
    </div>,
    { ...size },
  );
}
