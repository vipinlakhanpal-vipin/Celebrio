import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
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
        <span style={{ fontSize: 108, fontWeight: 800, color: "#ffffff" }}>C</span>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
