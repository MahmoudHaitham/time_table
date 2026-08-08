"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, ArrowLeft, Building, Home, X } from "lucide-react";

interface Term {
  id?: number;
  token: string;
  term_number: string;
  is_published: boolean;
  systemTypes?: number[]; // Array of system types this term supports (180, 160, 140)
}

/**
 * Check if campus track selection is required for given term and system
 * Only Term 4 with System 140 requires NORTHAMPTON/Normal separation
 */
function requiresCampusTrackSeparation(termNumber: number, systemType: number): boolean {
  return termNumber === 4 && systemType === 140;
}

export default function SystemTimetablePage() {
  const router = useRouter();
  const params = useParams();
  const systemType = params.systemType as string;
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Campus track selection modal state
  const [showCampusTrackModal, setShowCampusTrackModal] = useState(false);
  const [selectedTermForCampusTrack, setSelectedTermForCampusTrack] = useState<Term | null>(null);

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

  const handleTermSelect = (term: Term) => {
    const termNum = parseInt(term.term_number);
    const parsedSystemType = parseInt(systemType);
    
    // Check if this term/system requires campus track selection (Term 4 System 140)
    if (requiresCampusTrackSeparation(termNum, parsedSystemType)) {
      setSelectedTermForCampusTrack(term);
      setShowCampusTrackModal(true);
      return;
    }
    
    // For other terms, navigate directly
    router.push(`/student/timetable/system/${systemType}/${term.token}`);
  };
  
  const handleCampusTrackSelect = (campusTrack: "northampton" | "normal") => {
    if (!selectedTermForCampusTrack) return;
    
    // Store the campus track in sessionStorage for use in the preferences page
    sessionStorage.setItem(`campus_track_${selectedTermForCampusTrack.token}`, campusTrack);
    
    // Close modal and navigate
    setShowCampusTrackModal(false);
    setSelectedTermForCampusTrack(null);
    router.push(`/student/timetable/system/${systemType}/${selectedTermForCampusTrack.token}`);
  };
  
  const closeCampusTrackModal = () => {
    setShowCampusTrackModal(false);
    setSelectedTermForCampusTrack(null);
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
              {terms.map((term, idx) => {
                const termNum = parseInt(term.term_number);
                const parsedSystemType = parseInt(systemType);
                const needsCampusTrack = requiresCampusTrackSeparation(termNum, parsedSystemType);
                
                return (
                  <motion.button
                    key={term.token || idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleTermSelect(term)}
                    className={`p-8 glass border rounded-2xl transition-all hover:scale-105 ${
                      needsCampusTrack 
                        ? "border-amber-500/30 hover:border-amber-500/70 hover:bg-amber-500/10" 
                        : "border-white/10 hover:border-cyan-500/50 hover:bg-white/5"
                    }`}
                  >
                    <div className="text-white font-bold text-2xl mb-3">
                      {term.term_number}
                    </div>
                    {needsCampusTrack && (
                      <div className="text-xs text-amber-400 mt-2">
                        Campus Selection
                      </div>
                    )}
                  </motion.button>
                );
              })}
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

      {/* Campus Track Selection Modal (NORTHAMPTON vs Normal) */}
      <AnimatePresence>
        {showCampusTrackModal && selectedTermForCampusTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={closeCampusTrackModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass border border-white/20 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-amber-500/30 to-orange-600/30 rounded-xl">
                    <Building className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">Select Campus</h3>
                    <p className="text-sm text-gray-400">Term {selectedTermForCampusTrack.term_number}</p>
                  </div>
                </div>
                <button
                  onClick={closeCampusTrackModal}
                  className="p-2 glass border border-white/10 rounded-lg hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Description */}
              <p className="text-gray-300 mb-6 text-sm sm:text-base">
                This term has separate schedules for NORTHAMPTON and Normal classes. 
                Please select which campus schedule you want to generate.
              </p>

              {/* Campus Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NORTHAMPTON Option */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCampusTrackSelect("northampton")}
                  className="p-4 sm:p-6 glass border-2 border-red-500/30 rounded-xl hover:border-red-500 hover:bg-red-500/10 transition-all text-left group overflow-hidden"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div className="p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors flex-shrink-0">
                      <Building className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                    </div>
                    <span className="font-bold text-base sm:text-lg text-white truncate">NORTHAMPTON</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400">
                    NORTHAMPTON ONLY classes
                  </p>
                </motion.button>

                {/* Normal Option */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCampusTrackSelect("normal")}
                  className="p-4 sm:p-6 glass border-2 border-cyan-500/30 rounded-xl hover:border-cyan-500 hover:bg-cyan-500/10 transition-all text-left group overflow-hidden"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg group-hover:bg-cyan-500/30 transition-colors flex-shrink-0">
                      <Home className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                    </div>
                    <span className="font-bold text-base sm:text-lg text-white truncate">Normal</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Regular classes
                  </p>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
