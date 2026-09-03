"use client";

/**
 * Last line of defence: a failure in the root layout itself, where error.tsx
 * never gets to render. It has to supply its own <html> and <body>, and it
 * cannot rely on the app's stylesheet having loaded, so the styling here is
 * inline on purpose — including the dark ground, which would otherwise fall
 * back to white and flash against the rest of the site.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          background: "#020617",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: "1rem", color: "#94a3b8", lineHeight: 1.6 }}>
            This page didn&apos;t load properly. Trying again usually sorts it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.875rem 1.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#1463ff",
              color: "#ffffff",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#64748b" }}>
              Reference <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
