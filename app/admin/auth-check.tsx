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
        const token = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
        
        if (!token) {
          router.push("/login");
          return;
        }

        // Verify token with backend
        const { authAPI } = await import("@/lib/api/auth");
        await authAPI.getCurrentUser();
        
        setIsAuthenticated(true);
      } catch (error) {
        // Token invalid or expired
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth_token");
          sessionStorage.removeItem("csrf_token");
          sessionStorage.removeItem("user");
        }
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
