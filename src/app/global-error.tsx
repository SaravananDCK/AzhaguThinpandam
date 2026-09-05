"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

// Catches errors thrown by the root layout itself, where error.tsx cannot
// help. It replaces the whole document, so it renders its own <html>/<body>
// and uses no Tailwind (globals.css belongs to the layout that just failed).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
        <p style={{ maxWidth: 360, color: "#666", margin: 0 }}>
          Sorry, an unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#9b1c1c",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
