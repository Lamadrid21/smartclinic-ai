import { Router } from "express";
import {
  getAiCollectorMetrics,
  postAiCollector,
  getOpenApiSpec,
  getSwaggerUi,
} from "../controllers/aiCollector.controller.js";

const router = Router();

// AI Collector endpoints
router.get("/", getAiCollectorMetrics);
router.post("/", postAiCollector);

// Swagger / OpenAPI documentation endpoints
router.get("/docs/json", getOpenApiSpec);
router.get("/docs", getSwaggerUi);

export default router;
