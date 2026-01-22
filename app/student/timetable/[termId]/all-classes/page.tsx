"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, Clock, MapPin, User } from "lucide-react";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [1, 2, 3, 4];

export default function AllClassesPage() {
  const router = useRouter();
  const params = useParams();
  const termToken = params.termId as string; // Now using token instead of ID

  const [allClassesTimetable, setAllClassesTimetable] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (termToken) {
      loadTimetable();
    }
  }, [termToken]);

  const loadTimetable = async () => {
    if (!termToken) return;
    
    try {
      setLoading(true);
      const timetableRes = await studentTimetableAPI.getTermTimetable(termToken);
      setAllClassesTimetable(timetableRes.data || null);
    } catch (err: any) {
      setError(err.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 sm:p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading timetable...</p>
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
            <div className="p-5 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-2xl shadow-lg shadow-cyan-500/20">
              <Calendar className="w-10 h-10 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                All Classes <span className="text-gradient">Timetable</span>
              </h1>
              <p className="text-gray-400 text-lg">View all class timetables for this term</p>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              All Classes Timetables - Term {allClassesTimetable?.term?.term_number || "Loading..."}
            </h2>
            <button
              onClick={() => router.push(`/student/timetable/${termToken}`)}
              className="px-6 py-3 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all"
            >
              Back to Preferences
            </button>
          </div>

          {allClassesTimetable?.classes && allClassesTimetable.classes.length > 0 ? (
            <div className="space-y-8">
              {allClassesTimetable.classes.map((classData: any, classIndex: number) => (
                <motion.div
                  key={classData.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: classIndex * 0.1 }}
                  className="glass border border-white/10 rounded-xl p-6 overflow-hidden"
                >
                  <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Clock className="w-6 h-6 text-cyan-400" />
                    </div>
                    Class {classData.class_code}
                  </h2>

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
                            transition={{ delay: (classIndex * 0.1) + (dayIndex * 0.02) }}
                            className="border-t border-white/10"
                          >
                            <td className="p-4 text-white font-semibold">{day}</td>
                            {SLOTS.map((slot) => {
                              const sessions: any[] = [];
                              classData.courses?.forEach((courseData: any) => {
                                courseData.components?.forEach((component: any) => {
                                  component.sessions?.forEach((session: any) => {
                                    if (session.day === day && session.slot === slot) {
                                      sessions.push({
                                        ...session,
                                        course: courseData.course,
                                        component_type: component.component_type,
                                      });
                                    }
                                  });
                                });
                              });

                              return (
                                <td
                                  key={slot}
                                  className="p-2 min-w-[150px] h-24 border border-white/10"
                                >
                                  {sessions.length > 0 ? (
                                    <div className="space-y-1">
                                      {sessions.map((session, idx) => (
                                        <motion.div
                                          key={idx}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="text-xs p-2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/50 rounded-lg backdrop-blur-sm"
                                        >
                                          <div className="font-semibold text-white mb-1">
                                            {session.course.code} ({session.component_type})
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
                                      ))}
                                    </div>
                                  ) : (
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

                  {classData.courses && classData.courses.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Courses:</h4>
                      <div className="flex flex-wrap gap-2">
                        {classData.courses.map((courseData: any, idx: number) => (
                          <div
                            key={idx}
                            className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full text-white text-sm"
                          >
                            {courseData.course.code} - {courseData.course.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              No classes found for this term.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
