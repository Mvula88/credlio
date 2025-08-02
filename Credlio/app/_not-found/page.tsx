export default function NotFound() {
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "4rem", margin: "0 0 1rem 0" }}>404</h1>
            <p style={{ fontSize: "1.2rem", margin: "0 0 2rem 0" }}>Page not found</p>
            <a
              href="/"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                textDecoration: "none",
                borderRadius: "0.5rem",
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
