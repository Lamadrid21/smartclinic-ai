import express from "express";
import cors from "cors";
import config from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// CORS: allow origins from CORS_ORIGINS or FRONTEND_URL.
const allowedOrigins = config.corsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Parse JSON request bodies.
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "SmartClinic Backend API is running" });
});

// All backend API routes
app.use("/api", apiRoutes);

// 404 + central error handling
app.use(notFound);
app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`[SmartClinic Backend] Listening on http://localhost:${config.port}`);
    console.log(`[SmartClinic Backend] CORS origins allowed: ${config.corsOrigins}`);
  });
}

export default app;