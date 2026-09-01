import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

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
          borderRadius: 8,
          background: "linear-gradient(135deg, #f59e0b 0%, #4f46e5 55%, #7c6cff 100%)",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>C</span>
      </div>
    ),
    { ...size }
  );
}
