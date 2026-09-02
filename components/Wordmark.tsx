// The whole Celebrio logo: no icon box, just the name itself set in a warm
// serif — the way a fine stationer's wordmark works. The "i" keeps its own
// natural dot, with a small gold-to-rose spark glinting just beside it — a
// two-dot layered sparkle, not a replacement of the letter's dot. Shared by
// the NavBar and the login/signup screens so the brand mark is identical
// everywhere it appears.
export function Wordmark({ size }: { size: number }) {
  return (
    <span className="font-wordmark font-semibold text-[var(--fg)]" style={{ fontSize: size }} aria-label="Celebrio">
      <span aria-hidden="true">
        Celebr
        <span className="relative inline-block">
          i
          <span
            className="absolute rounded-full"
            style={{
              left: "0.09em",
              top: "-0.16em",
              width: "0.17em",
              height: "0.17em",
              background: "linear-gradient(135deg, #ffd27a, #d6336c)",
            }}
          />
        </span>
        o
      </span>
    </span>
  );
}
