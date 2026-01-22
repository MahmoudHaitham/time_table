"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, BookOpen, Clock, MapPin, User, ArrowLeft, X } from "lucide-react";

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

export default function OtherSectionSchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);
  const schedulesPerPage = 5;

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = () => {
    try {
      setLoading(true);
      setError(null);

      // Get schedules from sessionStorage
      const schedulesStr = sessionStorage.getItem("other_section_schedules");
      const excludedDaysStr = sessionStorage.getItem("other_section_excluded_days");

      if (!schedulesStr) {
        setError("No schedules found. Please go back and generate schedules.");
        setLoading(false);
        return;
      }

      const schedulesData = JSON.parse(schedulesStr);
      setSchedules(schedulesData || []);
      setExcludedDays(excludedDaysStr ? JSON.parse(excludedDaysStr) : []);

      if (schedulesData.length === 0) {
        setError("No valid schedules could be generated. Please try different course selections.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load schedules");
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
        return "bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-gray-500/50";
    }
  };

  const getComponentTypeLabel = (componentType: string) => {
    switch (componentType) {
      case "L":
        return "Lecture";
      case "S":
        return "Section";
      case "LB":
        return "Lab";
      default:
        return componentType;
    }
  };

  const totalPages = Math.ceil(schedules.length / schedulesPerPage);
  const startIndex = (currentPage - 1) * schedulesPerPage;
  const endIndex = startIndex + schedulesPerPage;
  const currentSchedules = schedules.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen p-6 sm:p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading schedules...</p>
        </div>
      </div>
    );
  }

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
              onClick={() => router.push("/student/timetable/other")}
              className="p-3 glass border border-white/10 rounded-xl hover:border-purple-500/50 hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="p-5 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-2xl shadow-lg shadow-purple-500/20">
              <Calendar className="w-10 h-10 text-purple-400" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                Generated <span className="text-gradient">Schedules</span>
              </h1>
              <p className="text-gray-400 text-lg">
                {schedules.length} schedule{schedules.length !== 1 ? "s" : ""} found
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

        {schedules.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-8 glass border border-white/10 rounded-2xl text-center"
          >
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
            <p className="text-xl font-semibold text-white mb-2">No schedules found</p>
            <p className="text-gray-400">Please go back and try different course selections or excluded days.</p>
          </motion.div>
        )}

        {/* Schedules List */}
        {currentSchedules.map((schedule, scheduleIdx) => {
          const globalIdx = startIndex + scheduleIdx;
          const isPerfect = schedule.excludedDaysUsed === 0;
          const isExcellent = isPerfect && schedule.totalDays <= 3 && schedule.gaps <= 2;

          return (
            <motion.div
              key={globalIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: scheduleIdx * 0.1 }}
              className="mb-10 glass border border-white/10 rounded-2xl p-8 sm:p-10 shadow-xl"
            >
              {/* Schedule Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Schedule {globalIdx + 1}
                    {isExcellent && (
                      <span className="ml-3 text-sm bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full font-bold">
                        ⭐ EXCELLENT
                      </span>
                    )}
                    {isPerfect && !isExcellent && (
                      <span className="ml-3 text-sm bg-gradient-to-r from-green-400 to-emerald-500 text-black px-3 py-1 rounded-full font-bold">
                        ✓ PERFECT
                      </span>
                    )}
                  </h2>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {schedule.totalDays} day{schedule.totalDays !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {schedule.gaps} gap{schedule.gaps !== 1 ? "s" : ""}
                    </span>
                    {schedule.excludedDaysUsed > 0 && (
                      <span className="flex items-center gap-2 text-red-400">
                        <X className="w-4 h-4" />
                        {schedule.excludedDaysUsed} excluded day{schedule.excludedDaysUsed !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Timetable Grid */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 text-left text-gray-400 font-semibold border-b border-white/10">Day / Slot</th>
                      {SLOTS.map((slot) => (
                        <th key={slot} className="p-3 text-center text-white font-semibold border-b border-white/10">
                          {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dayIndex) => (
                      <tr
                        key={day}
                        className={`border-t border-white/10 ${
                          excludedDays.includes(day) ? "bg-red-500/10" : ""
                        }`}
                      >
                        <td
                          className={`p-4 text-white font-semibold ${
                            excludedDays.includes(day) ? "text-red-400" : ""
                          }`}
                        >
                          {day}
                        </td>
                        {SLOTS.map((slot) => {
                          const session = schedule.sessions.find(
                            (s) => s.day === day && s.slot === slot
                          );
                          return (
                            <td
                              key={slot}
                              className="p-2 min-w-[200px] h-24 border border-white/10"
                            >
                              {session ? (
                                <div
                                  className={`p-3 rounded-lg border text-white ${getSlotColor(
                                    session.component_type
                                  )}`}
                                >
                                  <div className="font-bold text-sm mb-1">
                                    {session.course.code}
                                  </div>
                                  <div className="text-xs opacity-90 mb-1">
                                    {getComponentTypeLabel(session.component_type)}
                                  </div>
                                  {session.room && (
                                    <div className="text-xs opacity-75 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {session.room}
                                    </div>
                                  )}
                                  {session.instructor && (
                                    <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
                                      <User className="w-3 h-3" />
                                      {session.instructor}
                                    </div>
                                  )}
                                  <div className="text-xs opacity-60 mt-1">
                                    {session.class.class_code}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-600 text-xs text-center pt-4">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Courses List */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Courses in this schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schedule.courses.map((courseData, idx) => (
                    <div
                      key={idx}
                      className="p-4 glass border border-white/10 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-bold text-white mb-1">
                            {courseData.course.code}
                            {courseData.course.is_elective && (
                              <span className="ml-2 text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">
                                Elective
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-300 mb-2">
                            {courseData.course.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            Class: {courseData.class.class_code}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {courseData.sessions.length} session{courseData.sessions.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 mt-10"
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-6 py-3 glass border border-white/10 rounded-xl font-semibold text-white hover:border-purple-500/50 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-6 py-3 glass border border-white/10 rounded-xl font-semibold text-white hover:border-purple-500/50 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
