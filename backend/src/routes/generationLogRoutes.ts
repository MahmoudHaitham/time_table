import { Router } from "express";
import { getGenerationLogs } from "../controllers/generationLogController";

const router = Router();

// GET / - List all generation logs (admin only; auth middleware applied in app.ts)
router.get("/", getGenerationLogs);

export default router;
