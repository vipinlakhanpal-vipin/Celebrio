import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f59e0b 0%, #4f46e5 55%, #7c6cff 100%)",
        }}
      >
        <span style={{ fontSize: 100, fontWeight: 800, color: "#ffffff" }}>C</span>
      </div>
    ),
    { ...size }
  );
}
