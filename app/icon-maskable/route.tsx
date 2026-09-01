import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// Maskable icons get cropped to a circle/squircle/rounded-square by the OS,
// so the glyph is kept well inside the safe zone (the background gradient
// is allowed to bleed to the edges, but the "C" mark itself sits within the
// inner ~60% so nothing important gets clipped by the mask).
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
        <span style={{ fontSize: 190, fontWeight: 800, color: "#ffffff" }}>C</span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
