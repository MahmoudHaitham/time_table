"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, ArrowLeft, BookOpen, MapPin, User } from "lucide-react";

interface ElectiveSlot {
  course: {
    id: number;
    code: string;
    name: string;
  };
  component: {
    id: number;
    component_type: "L" | "S" | "LB";
  };
  sessions: Array<{
    id: number;
    day: string;
    slot: number;
    room: string | null;
    instructor: string | null;
  }>;
  term_number: string;
  class_code: string;
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

export default function ElectivesPage() {
  const router = useRouter();
  const [selectedSystem, setSelectedSystem] = useState<180 | 160 | null>(null);
  const [electiveSlots, setElectiveSlots] = useState<ElectiveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSystem) {
      loadElectiveSlots();
    }
  }, [selectedSystem]);

  const loadElectiveSlots = async () => {
    if (!selectedSystem) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await studentTimetableAPI.getAllElectiveSlots(selectedSystem);
      setElectiveSlots(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load elective slots");
      setElectiveSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const getCellContent = (day: string, slot: number) => {
    return electiveSlots.filter(slotData => {
      return slotData.sessions.some(session => 
        session.day === day && session.slot === slot
      );
    }).map(slotData => {
      const session = slotData.sessions.find(s => s.day === day && s.slot === slot);
      return {
        ...slotData,
        session: session!,
      };
    });
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
            <div className="p-5 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-2xl shadow-lg shadow-green-500/20">
              <BookOpen className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                <span className="text-gradient">Electives</span>
              </h1>
              <p className="text-gray-400 text-lg">View all available elective course slots</p>
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

        {/* System Selection */}
        {!selectedSystem && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-xl shadow-lg shadow-green-500/20">
                <Calendar className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Select System</h2>
                <p className="text-gray-400">Choose a system to view elective slots</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                onClick={() => setSelectedSystem(180)}
                className="p-8 glass border rounded-2xl transition-all border-white/10 hover:border-green-500/50 hover:bg-white/5 hover:scale-105"
              >
                <div className="text-white font-bold text-4xl mb-2">180</div>
                <div className="text-gray-400 text-sm">System 180</div>
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => setSelectedSystem(160)}
                className="p-8 glass border rounded-2xl transition-all border-white/10 hover:border-green-500/50 hover:bg-white/5 hover:scale-105"
              >
                <div className="text-white font-bold text-4xl mb-2">160</div>
                <div className="text-gray-400 text-sm">System 160</div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Elective Slots Table */}
        {selectedSystem && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-white/10 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-xl shadow-lg shadow-green-500/20">
                  <Calendar className="w-7 h-7 text-green-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    System {selectedSystem} Electives
                  </h2>
                  <p className="text-gray-400">All elective course slots</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSystem(null)}
                className="px-4 py-2 glass border border-white/10 rounded-lg hover:border-green-500/50 transition-all text-white"
              >
                Change System
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading elective slots...</p>
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
                                  {cellContent.map((item, idx) => (
                                    <motion.div
                                      key={`${item.course.id}-${item.component.id}-${item.session.id}-${idx}`}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className={`text-xs p-2 ${getSlotColor(item.component.component_type)} rounded-lg backdrop-blur-sm border`}
                                    >
                                      <div className="font-semibold text-white">
                                        {item.course.code} ({item.component.component_type})
                                      </div>
                                      <div className="text-gray-200 text-xs mt-1">
                                        {item.course.name}
                                      </div>
                                      <div className="text-gray-300 text-xs mt-1">
                                        Term {item.term_number} • {item.class_code}
                                      </div>
                                      {item.session.room && (
                                        <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
                                          <MapPin className="w-3 h-3" />
                                          {item.session.room}
                                        </div>
                                      )}
                                      {item.session.instructor && (
                                        <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
                                          <User className="w-3 h-3" />
                                          {item.session.instructor}
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

            {!loading && electiveSlots.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <BookOpen className="w-16 h-16 mx-auto mb-6 opacity-50" />
                <p className="text-xl font-semibold mb-2">No elective slots found</p>
                <p className="text-sm">No elective courses scheduled for System {selectedSystem}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
