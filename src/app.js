const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { initializeDatabase } = require("./db/database");
const apiRouter = require("./routes/api");

dotenv.config();

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "indonav-api" });
  });

  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    console.error("Request error:", err);
    res.status(statusCode).json({
      error: err.message || "Unexpected server error"
    });
  });

  return app;
}

async function startServer() {
  await initializeDatabase();

  const app = createApp();
  const port = Number(process.env.PORT) || 3000;

  app.listen(port, () => {
    console.log(`IndoNav server listening on http://localhost:${port}`);
  });
}

module.exports = {
  createApp,
  startServer
};
