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
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* System Type Badge */}
        {systemType && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-full text-sm font-semibold">
              System {systemType}
            </span>
          </motion.div>
        )}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push("/timetable")}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Timetables</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-cyan-500/20 rounded-xl">
              <Calendar className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-5xl font-bold mb-2">
                <span className="text-gradient">{term.term_number}</span>
              </h1>
              <p className="text-gray-400">Academic Timetable</p>
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
            className="mb-6 flex gap-4 flex-wrap"
          >
            <button
              onClick={() => setSelectedClass(null)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
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
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
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
        <div className="space-y-8">
          {displayClasses.map((classItem, classIndex) => (
            <motion.div
              key={classItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: classIndex * 0.1 }}
              className="glass border border-white/10 rounded-xl p-6 overflow-hidden"
            >
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-cyan-400" />
                </div>
                Class {classItem.class_code}
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
                          const cellContent = getCellContent(day, slot, classItem);
                          return (
                            <td
                              key={slot}
                              className="p-2 min-w-[150px] h-24 border border-white/10"
                            >
                              {cellContent.length > 0 ? (
                                <div className="space-y-1">
                                  {cellContent.map((item) => (
                                    <motion.div
                                      key={`${item.session.id}-${item.component.id}-${item.course.id}`}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className={`text-xs p-2 ${getSlotColor(item.component.component_type)} rounded-lg backdrop-blur-sm border`}
                                    >
                                      <div className="font-semibold text-white mb-1">
                                        {item.course.code} ({item.component.component_type})
                                      </div>
                                      {item.session.room && (
                                        <div className="text-gray-300 text-xs flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {item.session.room}
                                        </div>
                                      )}
                                      {item.session.instructor && (
                                        <div className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                                          <User className="w-3 h-3" />
                                          {item.session.instructor}
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
