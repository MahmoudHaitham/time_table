import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log full error details server-side
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    status: err.status || err.statusCode,
    path: req.path,
    method: req.method,
  });

  const status = err.status || err.statusCode || 500;
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Generic error messages for production
  let message = "Internal server error";
  if (isDevelopment) {
    message = err.message || "Internal server error";
  } else if (status < 500) {
    // Client errors (4xx) can be more specific
    message = err.message || "Request failed";
  }

  return res.status(status).json({
    success: false,
    message,
    ...(isDevelopment && { 
      stack: err.stack,
      details: err.message,
    }),
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};

