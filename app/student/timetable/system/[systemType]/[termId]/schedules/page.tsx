"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, BookOpen, Clock, MapPin, User, Download, Users, ArrowLeft, X } from "lucide-react";

interface Course {
  id: number;
  code: string;
  name: string;
  is_elective: boolean;
}

interface Session {
  id: number;
  day: string;
  slot: number;
  room: string | null;
  instructor: string | null;
  component_type: string;
  course: Course;
  class: {
    id: number;
    class_code: string;
  };
}

interface Schedule {
  courses: Array<{
    course: Course;
    class: {
      id: number;
      class_code: string;
    };
    sessions: Session[];
  }>;
  sessions: Session[];
  days: string[];
  score: number;
  excludedDaysUsed: number;
  totalDays: number;
  gaps: number;
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [1, 2, 3, 4];

export default function SystemSchedulesPage() {
  const params = useParams();
  const router = useRouter();
  const termToken = params.termId as string;
  const systemType = parseInt(params.systemType as string);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);
  const [termNumber, setTermNumber] = useState<string>("");
  const schedulesPerPage = 5;

  useEffect(() => {
    if (termToken && systemType) {
      // Load term number from sessionStorage (using token as key)
      const storedTermNumber = sessionStorage.getItem(`term_number_${termToken}`);
      if (storedTermNumber) {
        setTermNumber(storedTermNumber);
      } else {
        setTermNumber("Term");
      }
      loadSchedules();
    }
  }, [termToken, systemType]);

  const loadSchedules = async () => {
    if (!termToken || !systemType) return;

    try {
      setLoading(true);
      setError(null);

      // Get preferences from sessionStorage (using token as key)
      const preferencesStr = sessionStorage.getItem(`timetable_preferences_${termToken}`);
      const preferences = preferencesStr ? JSON.parse(preferencesStr) : {
        excludedDays: [],
        electiveCourseIds: undefined,
        excludedCoreCourseIds: undefined,
        systemType,
      };

      setExcludedDays(preferences.excludedDays || []);

      const response = await studentTimetableAPI.generateSchedules({
        termId: termToken,
        excludedDays: preferences.excludedDays || [],
        electiveCourseIds: preferences.electiveCourseIds,
        excludedCoreCourseIds: preferences.excludedCoreCourseIds,
        systemType,
      });

      const schedulesData = response.data || [];
      // Sort schedules by quality
      const sortedSchedules = [...schedulesData].sort((a, b) => {
        if (a.excludedDaysUsed !== b.excludedDaysUsed) {
          return a.excludedDaysUsed - b.excludedDaysUsed;
        }
        if (a.totalDays !== b.totalDays) {
          return a.totalDays - b.totalDays;
        }
        if (a.gaps !== b.gaps) {
          return a.gaps - b.gaps;
        }
        return b.score - a.score;
      });

      setSchedules(sortedSchedules);
      setCurrentPage(1);

      if (schedulesData.length === 0 && response.message) {
        setError(response.message);
      } else if (schedulesData.length === 0) {
        setError("No schedules found matching your preferences. Try adjusting your excluded days or elective courses.");
      }
    } catch (err: any) {
      console.error("Error generating schedules:", err);
      setError(err.message || "Failed to generate schedules");
    } finally {
      setLoading(false);
    }
  };

  const getSlotColor = (componentType: string) => {
    switch (componentType) {
      case "L":
        // Lecture - Red
        return "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/50";
      case "S":
        // Section - Blue
        return "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50";
      case "LB":
        // Lab - Purple
        return "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/50";
      default:
        return "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/50";
    }
  };

  const handleDownloadPDF = async (schedule: Schedule, scheduleIndex: number) => {
    // PDF download implementation (same as term-specific page)
    // This can be copied from the existing schedules page if needed
  };

  const getCellContent = (schedule: Schedule, day: string, slot: number) => {
    const session = schedule.sessions.find(
      s => s.day === day && s.slot === slot
    );

    if (!session) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-xs p-2 ${getSlotColor(session.component_type)} rounded-lg backdrop-blur-sm border`}
      >
        <div className="font-semibold text-white mb-1 line-clamp-2">
          {session.course.name} ({session.component_type})
        </div>
        {session.room && (
          <div className="text-gray-300 text-xs flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {session.room}
          </div>
        )}
        {session.instructor && (
          <div className="text-gray-400 text-xs flex items-center gap-1 mt-1">
            <User className="w-3 h-3" />
            {session.instructor}
          </div>
        )}
      </motion.div>
    );
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
          <p className="text-white text-xl">Generating schedules...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.push(`/student/timetable/system/${systemType}/${termToken}`)}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Preferences</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-xl shadow-lg shadow-cyan-500/20">
              <Calendar className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1">
                Generated Schedules - System {systemType}
              </h1>
              <p className="text-gray-400 text-sm">
                Found <span className="text-cyan-400 font-bold">{schedules.length}</span> schedule{schedules.length !== 1 ? 's' : ''} matching your preferences
              </p>
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

        {schedules.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass border border-white/10 rounded-xl p-12 text-center shadow-xl"
          >
            <div className="p-4 bg-gray-500/20 rounded-xl w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-gray-400 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Schedules Found</h3>
            <p className="text-gray-400 mb-2">
              No schedules found matching your preferences.
            </p>
            <p className="text-gray-500 text-sm">
              Try adjusting your excluded days or elective courses.
            </p>
            <button
              onClick={() => router.push(`/student/timetable/system/${systemType}/${termToken}`)}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:scale-105 transition-all"
            >
              Go Back to Preferences
            </button>
          </motion.div>
        )}

        {/* Pagination */}
        {schedules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-white/10 rounded-xl p-5 mb-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-white">
                <span className="font-bold">
                  Showing {((currentPage - 1) * schedulesPerPage) + 1} - {Math.min(currentPage * schedulesPerPage, schedules.length)}
                </span>
                <span className="text-gray-400"> of {schedules.length} schedules</span>
                <span className="text-gray-500 text-sm ml-2">(Sorted by quality: best first)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 glass border border-white/10 rounded-lg text-white hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-white font-bold min-w-[100px] text-center bg-white/5 rounded-lg text-sm">
                  Page {currentPage} of {Math.ceil(schedules.length / schedulesPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(schedules.length / schedulesPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(schedules.length / schedulesPerPage)}
                  className="px-4 py-2 glass border border-white/10 rounded-lg text-white hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Schedules */}
        {schedules
          .slice((currentPage - 1) * schedulesPerPage, currentPage * schedulesPerPage)
          .map((schedule, index) => {
            const globalIndex = (currentPage - 1) * schedulesPerPage + index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass border border-white/10 rounded-xl p-6 overflow-hidden mb-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Clock className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        Schedule Option {globalIndex + 1}
                        {globalIndex === 0 && (
                          <span className="text-sm text-cyan-400 font-normal">⭐ Best</span>
                        )}
                        {schedule.excludedDaysUsed === 0 && schedule.totalDays <= 3 && schedule.gaps <= 2 && (
                          <span className="text-sm text-green-400 font-normal">✨ Excellent</span>
                        )}
                      </h2>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {schedule.totalDays} day(s) per week
                        </div>
                        {schedule.excludedDaysUsed > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <X className="w-4 h-4" />
                            {schedule.excludedDaysUsed} excluded day(s) used
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {schedule.gaps} gap(s)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timetable Grid */}
                <div className="overflow-x-auto mb-6">
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
                          transition={{ delay: (index * 0.1) + (dayIndex * 0.02) }}
                          className={`border-t border-white/10 ${
                            excludedDays.includes(day) ? "bg-red-500/10" : ""
                          }`}
                        >
                          <td className={`p-4 text-white font-semibold ${
                            excludedDays.includes(day) ? "text-red-400" : ""
                          }`}>
                            {day}
                          </td>
                          {SLOTS.map((slot) => {
                            const cellContent = getCellContent(schedule, day, slot);
                            return (
                              <td
                                key={slot}
                                className="p-2 min-w-[200px] h-24 border border-white/10"
                              >
                                {cellContent || (
                                  <div className="text-gray-600 text-xs text-center pt-4">-</div>
                                )}
                              </td>
                            );
                          })}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Courses & Classes Registration */}
                {schedule.courses && schedule.courses.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      Courses & Classes Registration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {schedule.courses.map((courseData: any, idx: number) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (index * 0.1) + (idx * 0.05) }}
                          className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="text-white font-semibold text-sm mb-1">
                                {courseData.course.code}
                              </div>
                              <div className="text-gray-300 text-xs mb-2">
                                {courseData.course.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs">Class:</span>
                                <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-300 text-xs font-semibold">
                                  {courseData.class.class_code}
                                </span>
                              </div>
                            </div>
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                              <Users className="w-4 h-4 text-cyan-400" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}
