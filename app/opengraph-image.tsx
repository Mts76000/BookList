import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b1120",
        color: "#e2e8f0",
        fontSize: 64,
        fontWeight: 700,
      }}
    >
      Starter
      <div style={{ fontSize: 28, fontWeight: 400, color: "#94a3b8", marginTop: 16 }}>
        Socle Next.js générique
      </div>
    </div>,
    { ...size },
  );
}
