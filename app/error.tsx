"use client";

import { useEffect } from "react";

// Root error boundary: catches any crash in any page (Settings included) and
// shows a real, readable message with the actual error instead of the
// browser's generic "This page couldn't load" dead-connection screen. If you
// see this, the text below is exactly what broke — screenshot it.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Celebrio] page error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "1.5rem",
        textAlign: "center",
        background: "#f8f8fb",
        color: "#1e1b2e",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ fontSize: "2rem" }}>⚠️</div>
      <h1 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Something went wrong loading this page</h1>
      <p style={{ maxWidth: 420, fontSize: "0.85rem", color: "#6b6478", margin: 0 }}>
        {error.message || "An unexpected error occurred."}
        {error.digest ? ` (digest: ${error.digest})` : ""}
      </p>
      <button
        onClick={() => reset()}
        style={{
          marginTop: "0.5rem",
          borderRadius: 999,
          background: "#4F46E5",
          color: "white",
          border: "none",
          padding: "0.6rem 1.4rem",
          fontSize: "0.85rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
