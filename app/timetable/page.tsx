"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { timetableViewAPI } from "@/lib/api/timetable";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";

interface Term {
  id?: number;
  token?: string;
  term_number: string;
  is_published: boolean;
  systemTypes?: number[]; // Array of system types this term supports (180, 160, 140)
}

export default function TimetableViewPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublishedTerms();
  }, []);

  const loadPublishedTerms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await timetableViewAPI.getPublishedTerms();
      
      // Handle response - check if data exists
      if (!response || !response.data) {
        setTerms([]);
        return;
      }
      
      // Handle both token-based and id-based responses
      const termsData = Array.isArray(response.data) ? response.data : [];
      
      // Ensure each term has a valid identifier (id or token)
      const mappedTerms = termsData
        .filter((term: any) => term && (term.id || term.token) && term.term_number)
        .map((term: any) => ({
          ...term,
          id: term.id || term.token, // Use token as id if id doesn't exist
          systemTypes: term.systemTypes || [], // Ensure systemTypes is always an array
        }));
      
      setTerms(mappedTerms);
    } catch (err: any) {
      console.error("[TimetableViewPage] Error loading terms:", err);
      setError(err.message || "Failed to load published terms. Please try again later.");
      setTerms([]);
    } finally {
      setLoading(false);
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
          <p className="text-white text-xl">Loading timetables...</p>
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
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-block mb-4"
          >
            <Calendar className="w-16 h-16 text-cyan-400" />
          </motion.div>
          <h1 className="text-5xl font-bold mb-2">
            University <span className="text-gradient">Timetable</span>
          </h1>
          <p className="text-gray-400 text-lg">View published academic schedules</p>
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

        {/* System Sections */}
        <div className="space-y-12">
          {[180, 160, 140].map((systemType) => {
            // Filter terms that support this system
            // Include terms that either:
            // 1. Have this system type in their systemTypes array, OR
            // 2. Have no systemTypes (empty array) - show in all sections
            const systemTerms = terms.filter(
              (term) => {
                if (!term.systemTypes || term.systemTypes.length === 0) {
                  // Show terms without system types in all sections
                  return true;
                }
                return term.systemTypes.includes(systemType);
              }
            );

            if (systemTerms.length === 0) return null;

            return (
              <motion.div
                key={systemType}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg border border-cyan-500/50">
                      <span className="text-2xl text-cyan-400">{systemType}</span>
                    </div>
                    <span>System {systemType}</span>
                  </h2>
                  <p className="text-gray-400">Academic schedules for System {systemType}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {systemTerms
                    .filter((term) => (term.id || term.token) && term.term_number)
                    .map((term, index) => {
                      // Use token if id doesn't exist, otherwise use id
                      const termIdentifier = term.id || term.token || `term-${index}`;
                      // Create unique key that includes term ID and system type to prevent React deduplication
                      const uniqueKey = `term-${term.id || term.token}-${systemType}-${term.term_number}-${index}`;
                      return (
                        <motion.div
                          key={uniqueKey}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <Link
                            href={`/timetable/terms/${termIdentifier}?system=${systemType}`}
                            className="block p-6 glass border border-white/10 rounded-xl hover:border-cyan-500/50 transition-all group relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-600/0 group-hover:from-cyan-500/10 group-hover:to-blue-600/10 transition-all duration-300"></div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-cyan-500/20 rounded-lg group-hover:bg-cyan-500/30 transition-colors">
                                  <Clock className="w-6 h-6 text-cyan-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white group-hover:text-gradient transition-colors">
                                  {term.term_number}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full text-sm font-semibold">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  Published
                                </span>
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-full text-sm font-semibold">
                                  System {systemType}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {terms.length === 0 && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No published timetables available at this time.</p>
            <p className="text-gray-500 text-sm mt-2">Please check back later or contact the administrator.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
