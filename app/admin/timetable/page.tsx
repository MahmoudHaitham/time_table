"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { termsAPI } from "@/lib/api/timetable";
import Link from "next/link";
import { LogOut, Plus, BookOpen, Trash2, User } from "lucide-react";
import { useAdminAuth } from "../auth-check";

interface Term {
  id: number;
  term_number: string;
  is_published: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TimetableAdminPage() {
  const router = useRouter();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTermNumber, setNewTermNumber] = useState("");
  const [deletingTermId, setDeletingTermId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadTerms();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const loadTerms = async () => {
    try {
      setLoading(true);
      const response = await termsAPI.getAll();
      const allTerms = response.data || [];
      
      // Sort terms by term_number (ascending: 3, 4, 5, ...)
      const sortedTerms = allTerms.sort((a: Term, b: Term) => {
        const termNumA = parseInt(a.term_number);
        const termNumB = parseInt(b.term_number);
        return termNumA - termNumB;
      });
      
      setTerms(sortedTerms);
      setError(null);
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("Authentication")) {
        router.push("/login");
      }
      setError(err.message || "Failed to load terms");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await termsAPI.create({ term_number: newTermNumber });
      setNewTermNumber("");
      setShowCreateModal(false);
      // Redirect to the newly created term details page using ID
      if (response.data?.id) {
        router.push(`/admin/timetable/terms/${response.data.id}`);
      } else {
        loadTerms();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create term");
    }
  };

  const handleDeleteTerm = async (termId: number) => {
    try {
      setDeletingTermId(termId);
      setError(null);
      await termsAPI.delete(termId);
      setShowDeleteConfirm(null);
      // Reload terms list
      loadTerms();
    } catch (err: any) {
      setError(err.message || "Failed to delete term");
    } finally {
      setDeletingTermId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-5xl font-bold mb-2">
              <span className="text-gradient">Timetable</span> Management
            </h1>
            <p className="text-gray-400">Manage academic terms and schedules</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/admin/timetable/courses"
              className="px-6 py-3 glass border border-white/10 rounded-lg hover:border-purple-500/50 transition-all flex items-center gap-2 group"
            >
              <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white">Courses</span>
            </Link>
            <Link
              href="/admin/timetable/instructors"
              className="px-6 py-3 glass border border-white/10 rounded-lg hover:border-orange-500/50 transition-all flex items-center gap-2 group"
            >
              <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white">Instructors</span>
            </Link>
            <Link
              href="/admin/timetable/coursesForOtherDept"
              className="px-6 py-3 glass border border-white/10 rounded-lg hover:border-green-500/50 transition-all flex items-center gap-2 group"
            >
              <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white">Other Depts</span>
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/50 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Term
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 glass border border-white/10 rounded-lg hover:border-red-500/50 transition-all flex items-center gap-2 group"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white">Logout</span>
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200"
          >
            {error}
          </motion.div>
        )}

        {/* Terms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {terms.map((term, index) => (
            <motion.div
              key={term.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className="p-6 glass border border-white/10 rounded-xl hover:border-cyan-500/50 transition-all relative">
                <Link
                  href={`/admin/timetable/terms/${term.id}`}
                  className="block pr-12"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-white group-hover:text-gradient transition-colors">
                      {term.term_number}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        term.is_published
                          ? "bg-green-500/20 text-green-400 border border-green-500/50"
                          : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                      }`}
                    >
                      {term.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Created: {new Date(term.createdAt).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(term.id);
                  }}
                  disabled={deletingTermId === term.id}
                  className="absolute top-4 right-4 p-2 glass border border-red-500/30 rounded-lg hover:border-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10 group/delete"
                  title="Delete term"
                >
                  <Trash2 className="w-4 h-4 text-red-400 group-hover/delete:text-red-300 transition-colors" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {terms.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            No terms found. Create your first term to get started.
          </motion.div>
        )}
      </div>

      {/* Create Term Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Create New Term</h2>
            <form onSubmit={handleCreateTerm}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Term Number</label>
                <input
                  type="text"
                  value={newTermNumber}
                  onChange={(e) => setNewTermNumber(e.target.value)}
                  className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="e.g., 2024-2025-1"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl transition-all"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTermNumber("");
                  }}
                  className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Delete Term</h2>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this term? This action cannot be undone.
              {terms.find(t => t.id === showDeleteConfirm)?.is_published && (
                <span className="block mt-2 text-yellow-400 font-semibold">
                  ⚠️ This term is published. Deleting it will make it unavailable to students.
                </span>
              )}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteTerm(showDeleteConfirm)}
                disabled={deletingTermId === showDeleteConfirm}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold shadow-lg shadow-red-500/50 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingTermId === showDeleteConfirm ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(null);
                  setError(null);
                }}
                disabled={deletingTermId === showDeleteConfirm}
                className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
