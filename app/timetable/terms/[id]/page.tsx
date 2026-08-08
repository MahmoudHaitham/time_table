"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { timetableViewAPI } from "@/lib/api/timetable";
import { ArrowLeft, Calendar, Clock, MapPin, User } from "lucide-react";

interface Class {
  id: number;
  class_code: string;
  courses: Array<{
    id: number;
    course: {
      id: number;
      code: string;
      name: string;
    };
    components: Array<{
      id: number;
      component_type: string;
      sessions: Array<{
        id: number;
        day: string;
        slot: number;
        room: string | null;
        instructor: string | null;
      }>;
    }>;
  }>;
}

interface Term {
  id: number;
  term_number: string;
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [1, 2, 3, 4];

export default function TermTimetablePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const termId = parseInt(params.id as string);
  const systemType = searchParams.get("system") ? parseInt(searchParams.get("system")!) : undefined;

  const [term, setTerm] = useState<Term | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  useEffect(() => {
    if (termId) {
      loadTimetable();
    }
  }, [termId, systemType]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const response = await timetableViewAPI.getTermTimetable(termId, systemType);
      setTerm(response.data.term);
      setClasses(response.data.classes || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const getCellContent = (day: string, slot: number, classData: Class) => {
    const sessions: Array<{
      session: any;
      component: any;
      course: any;
    }> = [];

    classData.courses.forEach((courseData) => {
      courseData.components.forEach((component) => {
        component.sessions.forEach((session) => {
          if (session.day === day && session.slot === slot) {
            sessions.push({
              session,
              component,
              course: courseData.course,
            });
          }
        });
      });
    });

    return sessions;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading timetable...</p>
        </motion.div>
      </div>
    );
  }

  if (!term) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Timetable not found</p>
          <button
            onClick={() => router.push("/timetable")}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold"
          >
            Back to Timetables
          </button>
        </div>
      </div>
    );
  }

  const displayClasses = selectedClass
    ? classes.filter((c) => c.id === selectedClass)
    : classes;

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* System Type Badge */}
        {systemType && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 sm:mb-4"
          >
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-full text-xs sm:text-sm font-semibold">
              System {systemType}
            </span>
          </motion.div>
        )}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <button
            onClick={() => router.push("/timetable")}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-3 sm:mb-4 transition-colors group min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base">Back to Timetables</span>
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-cyan-500/20 rounded-lg sm:rounded-xl">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                <span className="text-gradient">{term.term_number}</span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">Academic Timetable</p>
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

        {/* Class Filter */}
        {classes.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 flex gap-2 sm:gap-3 md:gap-4 flex-wrap overflow-x-auto pb-2"
          >
            <button
              onClick={() => setSelectedClass(null)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-all whitespace-nowrap min-h-[44px] flex items-center ${
                selectedClass === null
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50"
                  : "glass border border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/50"
              }`}
            >
              All Classes
            </button>
            {classes.map((classItem) => (
              <button
                key={classItem.id}
                onClick={() => setSelectedClass(classItem.id)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-all whitespace-nowrap min-h-[44px] flex items-center ${
                  selectedClass === classItem.id
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50"
                    : "glass border border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/50"
                }`}
              >
                {classItem.class_code}
              </button>
            ))}
          </motion.div>
        )}

        {/* Timetables */}
        <div className="space-y-6 sm:space-y-8">
          {displayClasses.map((classItem, classIndex) => (
            <motion.div
              key={classItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: classIndex * 0.1 }}
              className="glass border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 overflow-hidden"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-cyan-500/20 rounded-lg">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                </div>
                Class {classItem.class_code}
              </h2>
              {/* Mobile: Stacked Day View */}
              <div className="block md:hidden space-y-4">
                {DAYS.map((day, dayIndex) => {
                  const daySessions: Array<{slot: number; sessions: any[]}> = [];
                  SLOTS.forEach((slot) => {
                    const cellContent = getCellContent(day, slot, classItem);
                    if (cellContent.length > 0) {
                      daySessions.push({ slot, sessions: cellContent });
                    }
                  });
                  
                  if (daySessions.length === 0) return null;
                  
                  return (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (classIndex * 0.1) + (dayIndex * 0.02) }}
                      className="border border-white/10 rounded-lg p-3 sm:p-4"
                    >
                      <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">{day}</h3>
                      <div className="space-y-2">
                        {daySessions.map(({ slot, sessions }) => (
                          <div key={slot} className="space-y-1.5">
                            <div className="text-xs text-gray-400 font-medium">Slot {slot}</div>
                            {sessions.map((item) => (
                              <motion.div
                                key={`${item.session.id}-${item.component.id}-${item.course.id}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`text-xs p-2 sm:p-2.5 ${getSlotColor(item.component.component_type)} rounded-lg backdrop-blur-sm border`}
                              >
                                <div className="font-semibold text-white mb-1 text-xs sm:text-sm">
                                  {item.course.name} ({item.component.component_type})
                                </div>
                                {item.session.room && (
                                  <div className="text-gray-300 text-xs flex items-center gap-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{item.session.room}</span>
                                  </div>
                                )}
                                {item.session.instructor && (
                                  <div className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                                    <User className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{item.session.instructor}</span>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Desktop: Table View */}
              <div className="hidden md:block overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="p-3 sm:p-4 text-left text-white font-semibold text-sm sm:text-base sticky left-0 bg-gray-900/95 z-10">Day / Slot</th>
                      {SLOTS.map((slot) => (
                        <th key={slot} className="p-3 sm:p-4 text-center text-white font-semibold text-sm sm:text-base min-w-[120px]">
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
                        <td className="p-3 sm:p-4 text-white font-semibold text-sm sm:text-base sticky left-0 bg-gray-900/95 z-10">{day}</td>
                        {SLOTS.map((slot) => {
                          const cellContent = getCellContent(day, slot, classItem);
                          return (
                            <td
                              key={slot}
                              className="p-2 min-w-[120px] h-20 sm:h-24 border border-white/10"
                            >
                              {cellContent.length > 0 ? (
                                <div className="space-y-1">
                                  {cellContent.map((item) => (
                                    <motion.div
                                      key={`${item.session.id}-${item.component.id}-${item.course.id}`}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className={`text-xs p-1.5 sm:p-2 ${getSlotColor(item.component.component_type)} rounded-lg backdrop-blur-sm border`}
                                    >
                                      <div className="font-semibold text-white mb-1 text-xs">
                                        {item.course.name} ({item.component.component_type})
                                      </div>
                                      {item.session.room && (
                                        <div className="text-gray-300 text-xs flex items-center gap-1">
                                          <MapPin className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{item.session.room}</span>
                                        </div>
                                      )}
                                      {item.session.instructor && (
                                        <div className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                                          <User className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{item.session.instructor}</span>
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
            </motion.div>
          ))}
        </div>

        {displayClasses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            No classes found for this term.
          </motion.div>
        )}
      </div>
    </div>
  );
}
