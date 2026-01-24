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
import { validateCSRFToken, addCSRFToken } from "./middleware/csrf";
import { rateLimiters } from "./middleware/rateLimiter";

const app = express();

// Trust proxy if behind load balancer
app.set("trust proxy", 1);

// CORS Configuration - MUST BE FIRST, before any other middleware
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  process.env.CLIENT_URL ||
  "http://localhost:8000,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim());

const isDevelopment = process.env.NODE_ENV !== "production";

// CORS - FIRST MIDDLEWARE (before body parser, cookie parser, everything)
// This MUST be first to handle preflight OPTIONS requests
// IMPORTANT: When credentials: true, you CANNOT use "*" as origin - must return actual origin string
const corsMiddleware = cors({
  origin: (origin, callback) => {
    // In development, allow ALL origins
    if (isDevelopment) {
      // Log for debugging
      console.log(`[CORS] Request from origin: ${origin || "none"} - ALLOWING (dev mode)`);
      // CRITICAL: When credentials: true, we MUST return the actual origin string, not "*"
      // If no origin (like server-to-server), return true to allow, but browser requests will have origin
      if (origin) {
        return callback(null, origin); // Return the actual origin string
      }
      // For requests without origin (like curl, server-to-server), allow but don't set CORS headers
      return callback(null, true);
    }
    // In production, strict checking
    if (!origin) {
      // Allow requests with no origin (like mobile apps or curl requests)
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true); // cors library will use the origin from the request
    }
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "Accept"],
  exposedHeaders: ["X-CSRF-Token"],
  maxAge: 86400, // Cache preflight for 24 hours
  optionsSuccessStatus: 200,
  preflightContinue: false,
});

app.use(corsMiddleware);

// Log CORS configuration on startup
console.log(`🌐 CORS Configuration: ${isDevelopment ? "DEVELOPMENT (allowing all origins)" : "PRODUCTION (strict origin checking)"}`);
console.log(`   Allowed origins: ${allowedOrigins.join(", ")}`);

// Explicit OPTIONS handler for all routes (as backup to cors middleware)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    console.log(`[OPTIONS PREFLIGHT] ${req.path} - Origin: ${origin || "none"}`);
    
    if (isDevelopment || (origin && allowedOrigins.includes(origin))) {
      // CRITICAL: When credentials: true, MUST use actual origin, not "*"
      if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, Accept");
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Max-Age", "86400");
        return res.status(200).end();
      }
    }
    return res.status(403).end();
  }
  next();
});

// Debug middleware to log all requests (only in development)
if (isDevelopment) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/health" || req.path === "/api/test" || req.path === "/api/cors-test") {
      console.log(`[${req.method}] ${req.path} - Origin: ${req.headers.origin || "none"}`);
    }
    next();
  });
}

// Body Parser (AFTER CORS)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie Parser (AFTER CORS)
app.use(cookieParser());

// Security Headers (after CORS to avoid conflicts)
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
    crossOriginResourcePolicy: false, // Allow cross-origin requests
    hsts:
      process.env.NODE_ENV === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
          }
        : false,
  })
);

// Auth Routes (public) - with rate limiting
app.use("/api/auth", rateLimiters.general, authRoutes);

// Public/Student Routes (no authentication required) - with rate limiting
app.use("/api/timetable", rateLimiters.timetable, timetableViewRoutes);

// Admin API Routes (protected - require authentication + CSRF)
// IMPORTANT: More specific routes must be registered BEFORE less specific ones
// Routes with parameters - must be registered with proper path handling (protected)
// CSRF token flow: 
//   - validateCSRFToken: validates POST/PUT/DELETE/PATCH and generates new token
//   - addCSRFToken: ensures GET requests also get tokens (only if not already set)
// Order: requireAuth -> validateCSRFToken -> addCSRFToken -> requireAdmin
// NOTE: /api/classes/:classId/courses must come BEFORE /api/classes to avoid route conflicts
app.use("/api/classes/:classId/courses", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, classCourseRoutes);
app.use("/api/terms/:termId/classes", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, classRoutes);
app.use("/api/terms/:termId/electives", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, electiveRoutes);
// Less specific routes come after
app.use("/api/terms", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, termRoutes);
app.use("/api/courses", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, courseRoutes);
app.use("/api/classes", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, classDirectRoutes);
app.use("/api/class-courses", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, classCourseDirectRouter);
app.use("/api/class-courses/:id/components", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, componentRoutes);
app.use("/api/components/:componentId/sessions", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, sessionRoutes);
// Direct session routes (for DELETE and PUT operations by session ID)
app.use("/api/sessions", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, sessionDirectRoutes);
// Other Departments routes
app.use("/api/other-dept", requireAuth, validateCSRFToken, addCSRFToken, requireAdmin, otherDeptRoutes);

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
  // Explicitly set CORS headers (though cors middleware should handle this)
  const origin = req.headers.origin;
  if (origin && (isDevelopment || allowedOrigins.includes(origin))) {
    // CRITICAL: When credentials: true, MUST use actual origin, not "*"
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cors: {
      origin: origin || "none",
      allowed: isDevelopment || !origin || allowedOrigins.includes(origin),
    },
  });
});

// Test endpoint for CORS debugging
app.get("/api/test", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Backend is reachable",
    origin: req.headers.origin || "none",
    timestamp: new Date().toISOString(),
    headers: {
      origin: req.headers.origin,
      "access-control-request-method": req.headers["access-control-request-method"],
      "access-control-request-headers": req.headers["access-control-request-headers"],
    },
  });
});

// CORS diagnostic endpoint
app.get("/api/cors-test", (req: Request, res: Response) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin"),
    "Access-Control-Allow-Methods": res.getHeader("Access-Control-Allow-Methods"),
    "Access-Control-Allow-Headers": res.getHeader("Access-Control-Allow-Headers"),
    "Access-Control-Allow-Credentials": res.getHeader("Access-Control-Allow-Credentials"),
  };
  
  res.json({
    success: true,
    message: "CORS test endpoint",
    requestOrigin: req.headers.origin || "none",
    corsHeaders: corsHeaders,
    allRequestHeaders: req.headers,
  });
});

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;

