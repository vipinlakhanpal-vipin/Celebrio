// The whole Celebrio logo: no icon box, just the name itself set in a warm
// serif — the way a fine stationer's wordmark works. The "i" keeps its own
// natural dot, with a small gold-to-rose spark glinting just beside it — a
// two-dot layered sparkle, not a replacement of the letter's dot. Shared by
// the NavBar and the login/signup screens so the brand mark is identical
// everywhere it appears.
export function Wordmark({ size, minSize }: { size: number; minSize?: number }) {
  // When minSize is given, the wordmark's font-size fluidly shrinks between
  // a "cramped desktop" width (768px — the md breakpoint the desktop bar
  // only ever shows above) and a comfortable full-size width (1024px),
  // instead of staying pinned at `size` and being forced to wrap onto a
  // second line once the window gets narrow. Below 768px the mobile top
  // strip takes over entirely, so nothing here needs to shrink further than
  // minSize; without a minSize passed in (the login/signup hero mark, the
  // mobile top strip) the size is just the fixed px value it always was.
  const slope = minSize !== undefined ? (size - minSize) / (1024 - 768) : 0;
  const intercept = minSize !== undefined ? minSize - 768 * slope : size;
  const fontSize =
    minSize !== undefined
      ? `clamp(${minSize}px, calc(${intercept}px + ${slope * 100}vw), ${size}px)`
      : size;

  return (
    <span
      className="font-wordmark font-semibold text-[var(--fg)]"
      // whiteSpace: nowrap is the actual fix for the two-line wrap — the
      // fluid clamp above just makes the shrink happen smoothly instead of
      // the mark staying full-size and overflowing right up until it wraps.
      style={{ fontSize, whiteSpace: "nowrap" }}
      aria-label="Celebrio"
    >
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
