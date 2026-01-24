"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import MagicBackground from "@/components/MagicBackground";
import FloatingShapes from "@/components/FloatingShapes";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    registration_number: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Get redirect parameter from URL using window.location (more reliable)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect) {
        console.log(`[Login] Found redirect parameter: ${redirect}`);
        setRedirectTo(redirect);
      } else {
        console.log("[Login] No redirect parameter found, will default to /admin/timetable");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent any event bubbling
    
    // Prevent double submission
    if (loading) {
      console.log("[Login] Already submitting, ignoring...");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { authAPI } = await import("@/lib/api/auth");
      
      // Log API URL being used
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      console.log("[Login] API URL:", apiUrl);
      console.log("[Login] Attempting login with:", { registration_number: formData.registration_number });
      
      const data = await authAPI.login(formData.registration_number, formData.password);
      console.log("[Login] Login successful:", data);

      // Verify token was stored
      const token = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
      if (!token) {
        throw new Error("Token was not stored. Please try again.");
      }
      console.log("[Login] Token stored successfully");

      // Token is stored in sessionStorage by authAPI.login
      // Refresh token is in httpOnly cookie set by backend
      // Access token cookie is set above for middleware

      // Redirect to the intended page or default to admin dashboard
      // Also check URL params one more time in case state wasn't updated
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const finalRedirect = redirectTo || urlParams?.get("redirect") || "/admin/timetable";
      
      // Redirect immediately
      window.location.href = finalRedirect;
    } catch (err: any) {
      console.error("[Login] Login error:", err);
      console.error("[Login] Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      
      // More detailed error message
      let errorMessage = err.message || "An error occurred during login.";
      
      // Check for common issues
      if (err.message?.includes("Failed to fetch") || err.message?.includes("Cannot connect")) {
        errorMessage = "Cannot connect to server. Please ensure:\n1. Backend is running\n2. API URL is correct\n3. CORS is configured";
      } else if (err.message?.includes("401") || err.message?.includes("Invalid credentials")) {
        errorMessage = "Invalid registration number or password. Please try again.";
      } else if (err.message?.includes("429")) {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
      }
      
      setError(errorMessage);
      setLoading(false);
    }
    // Note: Don't set loading to false in finally block if redirect succeeds
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8">
      <MagicBackground />
      <FloatingShapes />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-6 sm:mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              <span className="text-gradient">Timetable</span> System
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Sign in to continue
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-gray-300 mb-2 text-sm font-medium">
                Registration Number
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) =>
                  setFormData({ ...formData, registration_number: e.target.value })
                }
                className="w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all min-h-[44px]"
                placeholder="Enter registration number"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 text-sm font-medium">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all min-h-[44px]"
                placeholder="Enter password"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold text-sm sm:text-base shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-sm text-gray-400"
          >
            <p>University Timetable Management System</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

