import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware for protecting admin routes
 * This runs on the server before rendering pages
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    // Check for auth token in cookie (preferred) or Authorization header
    const token = request.cookies.get("auth_token")?.value || 
                  request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      // Redirect to login if no token
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Create response and ensure cookie is preserved for all admin routes
    const response = NextResponse.next();
    
    // Ensure the auth_token cookie is preserved in the response
    // This helps with client-side navigation across admin routes
    response.cookies.set("auth_token", token, {
      path: "/",
      sameSite: "lax",
      maxAge: 900, // 15 minutes
      httpOnly: false, // Allow client-side access
      secure: request.nextUrl.protocol === "https:",
    });
    
    // Add security headers
    addSecurityHeaders(response, request);
    
    return response;
  }

  // Add security headers to all other responses
  const response = NextResponse.next();
  addSecurityHeaders(response, request);

  return response;
}

// Helper function to add security headers
function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  // Content Security Policy
  // Get backend base URL (without /api path) for CSP
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const backendBaseUrl = apiUrl.replace(/\/api\/?$/, ""); // Remove /api suffix if present
  
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' " + backendBaseUrl + " " + apiUrl + "; " +
    "frame-ancestors 'none';"
  );

  // Other security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Exclude login, api routes, static files, and Next.js internals
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
