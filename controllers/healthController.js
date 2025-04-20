// controllers/healthController.js
exports.healthCheck = (_req, res) => {
  const now = new Date().toISOString();
  res.status(200).set("Content-Type", "text/html").send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Entangle Backend</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; background: #f0f0f0; }
          h1 { color: #3A1C4D; }
          p { color: #333; }
          .timestamp { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>✅ Entangle Backend is Running</h1>
        <p>Last deployed at: <span class="timestamp">${now}</span></p>
        <p>This confirms your GitHub Actions auto‑deploy & restart worked.</p>
      </body>
      </html>
    `);
};
