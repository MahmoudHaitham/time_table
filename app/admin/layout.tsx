"use client";

import { useAdminAuth } from "./auth-check";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  // Show loading while checking auth
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

  // If not authenticated, don't render (redirect handled by useAdminAuth)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}

