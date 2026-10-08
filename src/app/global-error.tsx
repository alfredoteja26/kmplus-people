"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#fafafa",
          color: "#222222",
          fontFamily: "system-ui, sans-serif",
          padding: 16,
        }}
      >
        <main role="alert" style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>KMPlus People didn’t load</h1>
          <p style={{ color: "#5e5e5e", lineHeight: 1.55 }}>
            Something went wrong before the app could start. Your saved work is not affected.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 12,
              border: 0,
              background: "#1a7870",
              color: "#ffffff",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
