import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ab4f27",
          color: "#f8f3ea",
          fontFamily: "Georgia, serif",
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        B
      </div>
    ),
    { ...size }
  )
}
