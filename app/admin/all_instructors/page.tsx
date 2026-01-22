"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionsAPI } from "@/lib/api/timetable";
import { Calendar, ArrowLeft, User, BookOpen, XCircle } from "lucide-react";

interface InstructorSchedule {
  instructor: string;
  schedule: Record<string, string[]>; // Key format: "Day_Slot" e.g., "Saturday_1"
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [1, 2, 3, 4];

export default function AllInstructorsPage() {
  const router = useRouter();
  const [instructorsSchedule, setInstructorsSchedule] = useState<InstructorSchedule[]>([]);
  const [filteredInstructors, setFilteredInstructors] = useState<InstructorSchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadInstructorsSchedule();
  }, [router]);

  const loadInstructorsSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sessionsAPI.getAllInstructorsSchedule();
      const instructors = response.data || [];
      setInstructorsSchedule(instructors);
      setFilteredInstructors(instructors);
    } catch (err: any) {
      setError(err.message || "Failed to load instructors schedule");
    } finally {
      setLoading(false);
    }
  };

  // Filter instructors based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInstructors(instructorsSchedule);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = instructorsSchedule.filter(instructor =>
        instructor.instructor.toLowerCase().includes(query)
      );
      setFilteredInstructors(filtered);
    }
  }, [searchQuery, instructorsSchedule]);

  const getCellContent = (instructor: InstructorSchedule, day: string, slot: number): string[] => {
    const key = `${day}_${slot}`;
    return instructor.schedule[key] || [];
  };

  // Generate column headers for all day/slot combinations
  const columns = DAYS.flatMap(day => 
    SLOTS.map(slot => ({ day, slot, label: `${day.substring(0, 3)} ${slot}` }))
  );

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-12">
      <div className="max-w-[95vw] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/admin/timetable")}
              className="p-3 glass border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="p-5 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-2xl shadow-lg shadow-purple-500/20">
              <User className="w-10 h-10 text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-2">
                All <span className="text-gradient">Instructors</span>
              </h1>
              <p className="text-gray-400 text-lg">Complete schedule overview for all instructors</p>
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

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 glass border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-4">
            <User className="w-5 h-5 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by instructor name..."
              className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-2 glass border border-white/10 rounded-lg hover:border-red-500/50 transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-400 hover:text-red-400" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-400">
              Showing {filteredInstructors.length} of {instructorsSchedule.length} instructor{instructorsSchedule.length !== 1 ? 's' : ''}
            </p>
          )}
        </motion.div>

        {/* Schedule Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass border border-white/10 rounded-2xl p-6 overflow-hidden"
        >
          {loading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-lg">Loading instructors schedule...</p>
            </div>
          ) : filteredInstructors.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-16 h-16 mx-auto mb-6 opacity-50" />
              <p className="text-xl font-semibold mb-2">
                {searchQuery ? "No instructors found" : "No instructors found"}
              </p>
              <p className="text-sm">
                {searchQuery
                  ? `No instructors match "${searchQuery}"`
                  : "No instructors with scheduled sessions"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 p-4 text-left text-white font-bold bg-gradient-to-br from-purple-500/30 to-pink-600/30 backdrop-blur-sm border-r border-white/20 min-w-[200px]">
                      Instructor
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        colSpan={SLOTS.length}
                        className="p-3 text-center text-white font-semibold bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-b border-white/10"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="sticky left-0 z-10 p-2 text-left text-white font-semibold bg-gradient-to-br from-purple-500/30 to-pink-600/30 backdrop-blur-sm border-r border-white/20 border-t border-white/10"></th>
                    {DAYS.map((day) =>
                      SLOTS.map((slot) => (
                        <th
                          key={`${day}-${slot}`}
                          className="p-2 text-center text-gray-300 font-medium text-sm border-t border-white/10 min-w-[150px]"
                        >
                          Slot {slot}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredInstructors.map((instructor, idx) => (
                    <motion.tr
                      key={instructor.instructor}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-t border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="sticky left-0 z-10 p-4 text-white font-semibold bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm border-r border-white/20">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-400" />
                          {instructor.instructor}
                        </div>
                      </td>
                      {DAYS.map((day) =>
                        SLOTS.map((slot) => {
                          const courses = getCellContent(instructor, day, slot);
                          return (
                            <td
                              key={`${day}-${slot}`}
                              className="p-2 align-top border-l border-white/10 min-w-[150px]"
                            >
                              {courses.length > 0 ? (
                                <div className="space-y-1">
                                  {courses.map((course, courseIdx) => (
                                    <motion.div
                                      key={`${course}-${courseIdx}`}
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="text-xs p-2 bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 rounded-lg backdrop-blur-sm"
                                    >
                                      <div className="font-semibold text-white break-words">
                                        {course}
                                      </div>
                                      <div className="text-purple-200 text-xs mt-1">
                                        {instructor.instructor}
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-500 text-xs text-center py-2">
                                  —
                                </div>
                              )}
                            </td>
                          );
                        })
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Summary */}
        {!loading && instructorsSchedule.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 glass border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-xl shadow-lg shadow-purple-500/20">
                <BookOpen className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Summary</h3>
                <p className="text-gray-400">
                  {searchQuery ? (
                    <>
                      Showing <span className="text-purple-400 font-semibold">{filteredInstructors.length}</span> of{" "}
                      <span className="text-purple-400 font-semibold">{instructorsSchedule.length}</span> instructor{instructorsSchedule.length !== 1 ? 's' : ''}
                    </>
                  ) : (
                    <>
                      Showing schedule for <span className="text-purple-400 font-semibold">{instructorsSchedule.length}</span> instructor{instructorsSchedule.length !== 1 ? 's' : ''}
                    </>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  All instructor names are retrieved from scheduled sessions
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
