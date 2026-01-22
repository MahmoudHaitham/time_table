"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, ArrowLeft } from "lucide-react";

interface Term {
  id?: number;
  token: string;
  term_number: string;
  is_published: boolean;
  systemTypes?: number[]; // Array of system types this term supports (180, 160, 140)
}

export default function SystemTimetablePage() {
  const router = useRouter();
  const params = useParams();
  const systemType = params.systemType as string;
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (systemType) {
      loadPublishedTerms();
    }
  }, [systemType]);

  const loadPublishedTerms = async () => {
    try {
      setLoading(true);
      const response = await studentTimetableAPI.getPublishedTerms();
      const parsedSystemType = parseInt(systemType);
      
      // Filter terms that:
      // 1. Are in the valid term range (3-10)
      // 2. Have classes with the selected system type
      const publishedTerms = (response.data || []).filter((t: Term) => {
        const termNum = parseInt(t.term_number);
        const isValidTerm = termNum >= 3 && termNum <= 10;
        
        if (!isValidTerm) return false;
        
        // Check if this term has classes with the selected system type
        if (t.systemTypes && t.systemTypes.length > 0) {
          return t.systemTypes.includes(parsedSystemType);
        }
        
        // If no systemTypes data, include it (for backward compatibility)
        // This allows terms without system data to appear in all sections
        return true;
      });
      
      // Sort terms by term_number (ascending: 3, 4, 5, ...)
      publishedTerms.sort((a: Term, b: Term) => {
        const termNumA = parseInt(a.term_number);
        const termNumB = parseInt(b.term_number);
        return termNumA - termNumB;
      });
      
      setTerms(publishedTerms);
    } catch (err: any) {
      setError(err.message || "Failed to load terms");
    } finally {
      setLoading(false);
    }
  };

  const handleTermSelect = (termToken: string) => {
    router.push(`/student/timetable/system/${systemType}/${termToken}`);
  };

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/student/timetable")}
              className="p-3 glass border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="p-5 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-2xl shadow-lg shadow-cyan-500/20">
              <Calendar className="w-10 h-10 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                System <span className="text-gradient">{systemType}</span>
              </h1>
              <p className="text-gray-400 text-lg">Select a term to generate your schedule</p>
            </div>
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

        {/* Term Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-xl shadow-lg shadow-cyan-500/20">
              <Calendar className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Select Term</h2>
              <p className="text-gray-400">Choose the academic term for System {systemType}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading terms...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {terms.map((term, idx) => (
                <motion.button
                  key={term.token || idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleTermSelect(term.token)}
                  className="p-8 glass border rounded-2xl transition-all border-white/10 hover:border-cyan-500/50 hover:bg-white/5 hover:scale-105"
                >
                  <div className="text-white font-bold text-2xl mb-3">
                    {term.term_number}
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {terms.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-16 h-16 mx-auto mb-6 opacity-50" />
              <p className="text-xl font-semibold mb-2">No published terms available</p>
              <p className="text-sm">No terms with System {systemType} classes found. Terms 3-10 with classes for this system will appear here when published.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
