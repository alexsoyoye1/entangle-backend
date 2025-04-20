// entangle-backend/controllers/healthController.js
export const healthCheck = (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
};
