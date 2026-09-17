import express from "express";
import cors from "cors";
import config from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// CORS: allow the SmartClinic frontend origin (FRONTEND_URL).
app.use(
  cors({
    origin: config.frontendUrl,
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

app.listen(config.port, () => {
  console.log(`[SmartClinic Backend] Listening on http://localhost:${config.port}`);
  console.log(`[SmartClinic Backend] CORS origin: ${config.frontendUrl}`);
});

export default app;