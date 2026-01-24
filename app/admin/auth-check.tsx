"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side auth check component for admin pages
 * Verifies authentication with backend before rendering content
 */
export function useAdminAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait a bit to ensure sessionStorage is available after redirect
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Check both sessionStorage and cookie for token
        const token = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
        const cookieToken = typeof document !== "undefined" ? 
          document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : null;
        
        // Use sessionStorage token first, fallback to cookie
        const authToken = token || cookieToken;
        
        if (!authToken) {
          console.log("[useAdminAuth] No token found in sessionStorage or cookie, redirecting to login");
          setIsLoading(false);
          setIsAuthenticated(false);
          router.push("/login");
          return;
        }

        // If we have cookie token but not sessionStorage, restore it
        if (!token && cookieToken && typeof window !== "undefined") {
          sessionStorage.setItem("auth_token", cookieToken);
          console.log("[useAdminAuth] Restored token from cookie to sessionStorage");
        }

        console.log("[useAdminAuth] Token found, verifying with backend...");

        // Verify token with backend
        const { authAPI } = await import("@/lib/api/auth");
        const userData = await authAPI.getCurrentUser();
        
        console.log("[useAdminAuth] Token verified, user:", userData);
        setIsAuthenticated(true);
      } catch (error: any) {
        // Token invalid or expired
        console.error("[useAdminAuth] Auth check failed:", error);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth_token");
          sessionStorage.removeItem("csrf_token");
          sessionStorage.removeItem("user");
          // Clear cookie
          document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        setIsAuthenticated(false);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isAuthenticated, isLoading };
}

/**
 * HOC to protect admin pages
 */
export function withAdminAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAdminAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-xl">Verifying authentication...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Redirect will happen in useAdminAuth
    }

    return <Component {...props} />;
  };
}
