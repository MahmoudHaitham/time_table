"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { generationLogsAPI } from "@/lib/api/timetable";
import { FileText, ArrowLeft, User, Calendar, BookOpen, ChevronDown, ChevronUp, LogOut } from "lucide-react";
import { useAdminAuth } from "../../auth-check";

interface GenerationLogRecord {
  id: number;
  user_name: string;
  flow_type: string;
  term_display: string;
  electives_selected: string | null;
  core_selected: string | null;
  result_summary: string;
  result_json: Record<string, unknown> | null;
  generated_at: string;
}

export default function GenerationLogsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [logs, setLogs] = useState<GenerationLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) return;
    loadLogs();
  }, [isAuthenticated, isLoading]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await generationLogsAPI.getLogs();
      setLogs(response.data || []);
    } catch (err: any) {
      if (err?.message?.includes("401") || err?.message?.includes("Authentication")) {
        router.push("/login");
        return;
      }
      setError(err?.message || "Failed to load generation logs");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { authAPI } = await import("@/lib/api/auth");
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("csrf_token");
      sessionStorage.removeItem("user");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
    }
    router.push("/login");
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">
            {isLoading ? "Verifying authentication..." : "Loading generation logs..."}
          </p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-screen-2xl mx-auto">
        {/* Header - same layout as admin timetable / templates */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
              <span className="text-gradient">Generation</span> Logs
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Logs for every schedule generation by students
            </p>
            <p className={`font-medium text-sm sm:text-base mt-1.5 ${logs.length > 0 ? "text-cyan-400" : "text-gray-500"}`}>
              Total: {logs.length} generation{logs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
            <Link
              href="/admin/timetable"
              className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all flex items-center gap-2 group text-sm sm:text-base min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-semibold text-white hidden sm:inline">Back</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 glass border border-white/10 rounded-lg hover:border-red-500/50 transition-all flex items-center gap-2 group text-sm sm:text-base min-h-[44px]"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-semibold text-white hidden sm:inline">Logout</span>
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm sm:text-base break-words"
          >
            {error}
          </motion.div>
        )}

        {logs.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass border border-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center shadow-xl"
          >
            <div className="p-3 sm:p-4 bg-gray-500/20 rounded-xl w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 opacity-50" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 break-words">No generation logs yet</h3>
            <p className="text-gray-400 mb-2 text-sm sm:text-base break-words">
              Logs will appear here when students generate schedules and enter their name.
            </p>
          </motion.div>
        )}

        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {logs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 sm:p-5 md:p-6 glass border border-white/10 rounded-lg sm:rounded-xl hover:border-cyan-500/50 transition-all overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(log.id)}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-white font-semibold truncate text-sm sm:text-base" title={log.user_name}>{log.user_name}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-300 truncate text-sm sm:text-base" title={log.term_display}>{log.term_display}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-300 truncate text-sm sm:text-base" title={log.result_summary}>{log.result_summary}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
                      <span>{new Date(log.generated_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {expandedId === log.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
                {expandedId === log.id && (
                  <div className="border-t border-white/10 mt-4 pt-4 sm:pt-5 bg-white/5 rounded-lg p-4 sm:p-5 space-y-3 text-sm sm:text-base">
                    <div>
                      <span className="text-gray-500 font-medium block mb-1">Elective(s) selected</span>
                      <p className="text-gray-300 break-words">{log.electives_selected || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium block mb-1">Core course(s) selected</span>
                      <p className="text-gray-300 break-words">{log.core_selected || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium block mb-1">Generation result</span>
                      <p className="text-gray-300 break-words">{log.result_summary}</p>
                      {log.result_json && Object.keys(log.result_json).length > 0 && (
                        <pre className="mt-2 p-2 sm:p-3 rounded-lg bg-black/20 text-gray-400 text-xs overflow-x-auto border border-white/10">
                          {JSON.stringify(log.result_json, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
