import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/authRoutes";
import termRoutes from "./routes/termRoutes";
import classRoutes from "./routes/classRoutes";
import classDirectRoutes from "./routes/classDirectRoutes";
import courseRoutes from "./routes/courseRoutes";
import classCourseRoutes, { classCourseDirectRouter } from "./routes/classCourseRoutes";
import componentRoutes from "./routes/componentRoutes";
import sessionRoutes from "./routes/sessionRoutes";
import sessionDirectRoutes from "./routes/sessionDirectRoutes";
import electiveRoutes from "./routes/electiveRoutes";
import timetableViewRoutes from "./routes/timetableViewRoutes";
import otherDeptRoutes from "./routes/otherDeptRoutes";
import { requireAuth, requireAdmin } from "./middleware/auth";

const app = express();

// Trust proxy if behind load balancer
app.set("trust proxy", 1);

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie Parser
app.use(cookieParser());

// CORS Configuration
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  process.env.CLIENT_URL ||
  "http://localhost:8000"
)
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'"],
            },
          }
        : false,
    crossOriginEmbedderPolicy: false,
    hsts:
      process.env.NODE_ENV === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
          }
        : false,
  })
);

// Auth Routes (public)
app.use("/api/auth", authRoutes);

// Public/Student Routes (no authentication required)
app.use("/api/timetable", timetableViewRoutes);

// Admin API Routes (protected - require authentication)
// IMPORTANT: More specific routes must be registered BEFORE less specific ones
// Routes with parameters - must be registered with proper path handling (protected)
app.use("/api/classes", requireAuth, requireAdmin, classDirectRoutes); // Direct class routes (DELETE /classes/:id)
app.use("/api/terms/:termId/classes", requireAuth, requireAdmin, classRoutes);
app.use("/api/terms/:termId/electives", requireAuth, requireAdmin, electiveRoutes);
// Less specific routes come after
app.use("/api/terms", requireAuth, requireAdmin, termRoutes);
app.use("/api/courses", requireAuth, requireAdmin, courseRoutes);
app.use("/api/classes/:classId/courses", requireAuth, requireAdmin, classCourseRoutes);
app.use("/api/class-courses", requireAuth, requireAdmin, classCourseDirectRouter);
app.use("/api/class-courses/:id/components", requireAuth, requireAdmin, componentRoutes);
app.use("/api/components/:componentId/sessions", requireAuth, requireAdmin, sessionRoutes);
// Direct session routes (for DELETE and PUT operations by session ID)
app.use("/api/sessions", requireAuth, requireAdmin, sessionDirectRoutes);
// Other Departments routes
app.use("/api/other-dept", requireAuth, requireAdmin, otherDeptRoutes);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "✅ Timetable Management System Backend Running",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;

