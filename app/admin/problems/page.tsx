"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { problemsAPI } from "@/lib/api/timetable";
import { AlertCircle, ArrowLeft, User, Hash, MapPin, FileText, LogOut, BookOpen, Check, X, RefreshCw } from "lucide-react";
import { useAdminAuth } from "../auth-check";

type ProblemStatus = "pending" | "solved" | "not_solved";

interface ProblemRecord {
  id: number;
  name: string;
  registration_number: string;
  northampton: string;
  term?: string;
  description: string;
  status?: ProblemStatus;
  created_at: string;
}

function ProblemCard({
  problem,
  index,
  currentStatus,
  isUpdating,
  expandedId,
  toggleExpand,
  setProblemStatus,
}: {
  problem: ProblemRecord;
  index: number;
  currentStatus: ProblemStatus;
  isUpdating: boolean;
  expandedId: number | null;
  toggleExpand: (id: number) => void;
  setProblemStatus: (id: number, status: ProblemStatus) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`p-4 sm:p-5 md:p-6 glass border rounded-lg sm:rounded-xl transition-all overflow-hidden ${
        currentStatus === "solved"
          ? "border-green-500/50 bg-green-950/20 hover:border-green-400/60"
          : currentStatus === "not_solved"
            ? "border-red-500/50 bg-red-950/20 hover:border-red-400/60"
            : "border-white/10 hover:border-red-500/50"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => toggleExpand(problem.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(problem.id); } }}
        className="w-full flex flex-col sm:flex-row sm:items-center gap-3 text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-white font-semibold truncate text-sm sm:text-base" title={problem.name}>{problem.name}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-gray-300 truncate text-sm sm:text-base" title={problem.registration_number}>{problem.registration_number}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm sm:text-base">Northampton: {problem.northampton === "yes" ? "Yes" : "No"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm sm:text-base">Term: {problem.term ? (problem.term === "other" ? "Other" : problem.term) : "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
            <span>{new Date(problem.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-red-400/80 text-xs font-medium">#{index + 1}</span>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setProblemStatus(problem.id, "solved")}
              title="Solved"
              className={`p-2 rounded-lg border transition-all flex-shrink-0 disabled:opacity-50 ${
                currentStatus === "solved"
                  ? "bg-green-500/30 border-green-400 text-green-400"
                  : "bg-slate-800/80 border-white/20 text-gray-400 hover:border-green-500/50 hover:text-green-400"
              }`}
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setProblemStatus(problem.id, "not_solved")}
              title="Not solved"
              className={`p-2 rounded-lg border transition-all flex-shrink-0 disabled:opacity-50 ${
                currentStatus === "not_solved"
                  ? "bg-red-500/30 border-red-400 text-red-400"
                  : "bg-slate-800/80 border-white/20 text-gray-400 hover:border-red-500/50 hover:text-red-400"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {expandedId === problem.id ? (
            <span className="text-gray-400 text-sm">Less</span>
          ) : (
            <span className="text-gray-400 text-sm">More</span>
          )}
        </div>
      </div>
      {expandedId === problem.id && (
        <div className="border-t border-white/10 mt-4 pt-4 sm:pt-5 bg-red-950/20 rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 font-medium text-sm sm:text-base">Full description</span>
          </div>
          <p
            className="text-red-100 text-sm sm:text-base break-words whitespace-pre-wrap border border-red-900/50 rounded-lg p-4 bg-red-950/30"
            dir="auto"
            style={{ minHeight: "2.5rem" }}
          >
            {problem.description}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function AdminProblemsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const solvedCount = problems.filter((p) => (p.status ?? "pending") === "solved").length;
  const notSolvedCount = problems.filter((p) => (p.status ?? "pending") === "not_solved").length;
  const pendingCount = problems.filter((p) => (p.status ?? "pending") === "pending").length;

  const notSolvedProblems = [...problems]
    .filter((p) => (p.status ?? "pending") !== "solved")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const solvedProblems = [...problems]
    .filter((p) => (p.status ?? "pending") === "solved")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  useEffect(() => {
    if (!isAuthenticated && !isLoading) return;
    loadProblems();
  }, [isAuthenticated, isLoading]);

  const loadProblems = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const response = await problemsAPI.getList();
      setProblems(response.data || []);
    } catch (err: any) {
      if (err?.message?.includes("401") || err?.message?.includes("Authentication")) {
        router.push("/login");
        return;
      }
      setError(err?.message || "Failed to load problem reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const setProblemStatus = async (id: number, status: ProblemStatus) => {
    if (updatingId !== null) return;
    setUpdatingId(id);
    try {
      await problemsAPI.updateStatus(id, status);
      setProblems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">
            {isLoading ? "Verifying authentication..." : "Loading problem reports..."}
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
              <span className="text-gradient">Student</span> Problems
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              First submitted are listed first — serve in this order
            </p>
            <div className="flex flex-wrap gap-4 mt-1.5 text-sm sm:text-base font-medium">
              <span className="text-red-400">Not solved: {notSolvedCount + pendingCount}</span>
              <span className="text-green-400">Solved: {solvedCount}</span>
              <span className="text-gray-500">Total: {problems.length}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => loadProblems(true)}
              disabled={refreshing}
              title="Refresh all problems"
              className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all flex items-center gap-2 group text-sm sm:text-base min-h-[44px] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${refreshing ? "animate-spin" : "group-hover:scale-110 transition-transform"}`} />
              <span className="font-semibold text-white hidden sm:inline">Refresh</span>
            </button>
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

        {problems.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass border border-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center shadow-xl"
          >
            <div className="p-3 sm:p-4 bg-gray-500/20 rounded-xl w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 opacity-50" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 break-words">No problem reports yet</h3>
            <p className="text-gray-400 mb-2 text-sm sm:text-base break-words">
              Reports will appear here when students submit from the Problem page. Oldest first.
            </p>
          </motion.div>
        )}

        {problems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* Not solved section (pending + not_solved) */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <X className="w-6 h-6" />
                Not solved
                <span className="text-base font-medium text-gray-400">({notSolvedProblems.length})</span>
              </h2>
              <div className="space-y-4">
                {notSolvedProblems.length === 0 ? (
                  <p className="text-gray-500 text-sm sm:text-base py-4">No unsolved problems.</p>
                ) : (
                  notSolvedProblems.map((problem, index) => {
                    const currentStatus = (problem.status ?? "pending") as ProblemStatus;
                    const isUpdating = updatingId === problem.id;
                    return (
                      <ProblemCard
                        key={problem.id}
                        problem={problem}
                        index={index}
                        currentStatus={currentStatus}
                        isUpdating={isUpdating}
                        expandedId={expandedId}
                        toggleExpand={toggleExpand}
                        setProblemStatus={setProblemStatus}
                      />
                    );
                  })
                )}
              </div>
            </section>

            {/* Solved section */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6" />
                Solved
                <span className="text-base font-medium text-gray-400">({solvedProblems.length})</span>
              </h2>
              <div className="space-y-4">
                {solvedProblems.length === 0 ? (
                  <p className="text-gray-500 text-sm sm:text-base py-4">No solved problems yet.</p>
                ) : (
                  solvedProblems.map((problem, index) => {
                    const currentStatus = "solved" as ProblemStatus;
                    const isUpdating = updatingId === problem.id;
                    return (
                      <ProblemCard
                        key={problem.id}
                        problem={problem}
                        index={index}
                        currentStatus={currentStatus}
                        isUpdating={isUpdating}
                        expandedId={expandedId}
                        toggleExpand={toggleExpand}
                        setProblemStatus={setProblemStatus}
                      />
                    );
                  })
                )}
              </div>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  );
}
