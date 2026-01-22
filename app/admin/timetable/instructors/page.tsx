"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionsAPI } from "@/lib/api/timetable";
import { Calendar, ArrowLeft, User, BookOpen, MapPin, Clock } from "lucide-react";

interface InstructorSession {
  id: number;
  day: string;
  slot: number;
  room: string | null;
  instructor: string;
  course: {
    id: number;
    code: string;
    name: string;
  };
  component: {
    id: number;
    component_type: "L" | "S" | "LB";
  };
  class: {
    id: number;
    class_code: string;
  };
  term: {
    id: number;
    term_number: string;
  };
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [1, 2, 3, 4];

// Color function for component types
const getSlotColor = (componentType: string) => {
  switch (componentType) {
    case "L":
      return "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/50";
    case "S":
      return "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50";
    case "LB":
      return "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/50";
    default:
      return "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/50";
  }
};

export default function InstructorSchedulePage() {
  const router = useRouter();
  const [instructors, setInstructors] = useState<string[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string>("");
  const [sessions, setSessions] = useState<InstructorSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadInstructors();
  }, [router]);

  useEffect(() => {
    if (selectedInstructor) {
      loadInstructorSessions();
    } else {
      setSessions([]);
    }
  }, [selectedInstructor]);

  const loadInstructors = async () => {
    try {
      setLoadingInstructors(true);
      const response = await sessionsAPI.getAllInstructors();
      setInstructors(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load instructors");
    } finally {
      setLoadingInstructors(false);
    }
  };

  const loadInstructorSessions = async () => {
    if (!selectedInstructor) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await sessionsAPI.getByInstructor(selectedInstructor);
      setSessions(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load instructor sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const getCellContent = (day: string, slot: number) => {
    return sessions.filter(session => session.day === day && session.slot === slot);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
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
            <div className="p-5 bg-gradient-to-br from-orange-500/30 to-amber-600/30 rounded-2xl shadow-lg shadow-orange-500/20">
              <User className="w-10 h-10 text-orange-400" />
            </div>
            <div>
              <h1 className="text-5xl font-bold mb-2">
                Instructor <span className="text-gradient">Schedule</span>
              </h1>
              <p className="text-gray-400">View schedule for any instructor</p>
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

        {/* Instructor Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass border border-white/10 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-orange-500/30 to-amber-600/30 rounded-xl shadow-lg shadow-orange-500/20">
              <User className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Select Instructor</h2>
              <p className="text-gray-400">Choose an instructor to view their schedule</p>
            </div>
          </div>

          {loadingInstructors ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading instructors...</p>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                list="instructors-list"
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                placeholder="Type or select instructor name..."
                className="w-full px-4 py-3 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
              <datalist id="instructors-list">
                {instructors.map((instructor, idx) => (
                  <option key={`${instructor}-${idx}`} value={instructor} />
                ))}
              </datalist>
            </div>
          )}
        </motion.div>

        {/* Schedule Table */}
        {selectedInstructor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-orange-500/30 to-amber-600/30 rounded-xl shadow-lg shadow-orange-500/20">
                <Calendar className="w-7 h-7 text-orange-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Schedule for {selectedInstructor}
                </h2>
                <p className="text-gray-400">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading schedule...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="p-4 text-left text-white font-semibold">Day / Slot</th>
                      {SLOTS.map((slot) => (
                        <th key={slot} className="p-4 text-center text-white font-semibold">
                          {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dayIndex) => (
                      <motion.tr
                        key={day}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: dayIndex * 0.05 }}
                        className="border-t border-white/10"
                      >
                        <td className="p-4 text-white font-semibold">{day}</td>
                        {SLOTS.map((slot) => {
                          const cellContent = getCellContent(day, slot);
                          return (
                            <td
                              key={slot}
                              className="p-2 min-w-[200px] h-auto border border-white/10 align-top"
                            >
                              {cellContent.length > 0 ? (
                                <div className="space-y-1">
                                  {cellContent.map((session, idx) => (
                                    <motion.div
                                      key={`${session.id}-${idx}`}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className={`text-xs p-2 ${getSlotColor(session.component.component_type)} rounded-lg backdrop-blur-sm border`}
                                    >
                                      <div className="font-semibold text-white">
                                        {session.course.code} ({session.component.component_type})
                                      </div>
                                      <div className="text-gray-200 text-xs mt-1">
                                        {session.course.name}
                                      </div>
                                      <div className="text-gray-300 text-xs mt-1">
                                        Term {session.term.term_number} • {session.class.class_code}
                                      </div>
                                      {session.room && (
                                        <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
                                          <MapPin className="w-3 h-3" />
                                          {session.room}
                                        </div>
                                      )}
                                    </motion.div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-500 text-xs text-center py-4">
                                  -
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && selectedInstructor && sessions.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Calendar className="w-16 h-16 mx-auto mb-6 opacity-50" />
                <p className="text-xl font-semibold mb-2">No sessions found</p>
                <p className="text-sm">No scheduled sessions for {selectedInstructor}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
