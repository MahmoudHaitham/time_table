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

// Cache key and TTL
const CACHE_KEY_PREFIX = "elective_slots_";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

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
  const [cacheStatus, setCacheStatus] = useState<"cached" | "fresh" | null>(null);

  useEffect(() => {
    if (selectedSystem) {
      loadElectiveSlots();
    }
  }, [selectedSystem]);

  const loadElectiveSlots = async (forceRefresh: boolean = false) => {
    if (!selectedSystem) return;
    
    try {
      setLoading(true);
      setError(null);

      const cacheKey = `${CACHE_KEY_PREFIX}${selectedSystem}`;

      // Check cache first (unless forcing refresh)
      if (!forceRefresh && typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const { data, hash, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            
            // Use cache if less than TTL old
            if (age < CACHE_TTL) {
              console.log(`[Electives] Loading from cache for System ${selectedSystem} (age: ${Math.round(age / 1000)}s)`);
              setElectiveSlots(data);
              setCacheStatus("cached");
              setLoading(false);
              return;
            } else {
              console.log(`[Electives] Cache expired for System ${selectedSystem}, fetching fresh data`);
            }
          } catch (e) {
            console.warn("[Electives] Cache parse error, fetching fresh data");
          }
        }
      }

      // Fetch fresh data from server
      console.log(`[Electives] Fetching fresh data for System ${selectedSystem}...`);
      const startTime = Date.now();
      const response = await studentTimetableAPI.getAllElectiveSlots(selectedSystem);
      const fetchTime = Date.now() - startTime;
      
      // Handle response - check if it has data directly or wrapped
      let data: ElectiveSlot[];
      let hash: string | null = null;
      
      if (Array.isArray(response)) {
        // Response is directly an array
        data = response;
      } else if (response.data) {
        // Response has data property
        data = response.data;
        hash = response.hash || null;
      } else {
        // Fallback
        data = [];
      }
      
      setElectiveSlots(data);

      // Cache the result with hash
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: data,
          hash: hash,
          timestamp: Date.now(),
        }));
        console.log(`[Electives] Data cached for System ${selectedSystem} (fetch took ${fetchTime}ms, hash: ${hash || 'N/A'})`);
        setCacheStatus("fresh");
      }
    } catch (err: any) {
      console.error("Failed to load elective slots:", err);
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
                  <p className="text-gray-400 text-sm sm:text-base">
                    All elective course slots
                    {cacheStatus === "cached" && (
                      <span className="ml-2 text-xs text-green-400">(Loaded from cache)</span>
                    )}
                    {cacheStatus === "fresh" && (
                      <span className="ml-2 text-xs text-blue-400">(Fresh data)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => loadElectiveSlots(true)}
                  disabled={loading}
                  className="px-3 sm:px-4 py-2 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all text-white text-sm sm:text-base disabled:opacity-50 min-h-[44px]"
                  title="Refresh data"
                >
                  <span className="text-cyan-400">Refresh</span>
                </button>
                <button
                  onClick={() => setSelectedSystem(null)}
                  className="px-3 sm:px-4 py-2 glass border border-white/10 rounded-lg hover:border-green-500/50 transition-all text-white text-sm sm:text-base min-h-[44px]"
                >
                  Change System
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 sm:py-16">
                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400 text-sm sm:text-base">Loading elective slots...</p>
              </div>
            ) : (
              <>
                {/* Mobile: Stacked Day View */}
                <div className="block md:hidden space-y-4">
                {DAYS.map((day, dayIndex) => {
                  const daySessions: Array<{slot: number; items: any[]}> = [];
                  SLOTS.forEach((slot) => {
                    const cellContent = getCellContent(day, slot);
                    if (cellContent.length > 0) {
                      daySessions.push({ slot, items: cellContent });
                    }
                  });
                  
                  if (daySessions.length === 0) return null;
                  
                  return (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: dayIndex * 0.05 }}
                      className="border border-white/10 rounded-lg p-3 sm:p-4"
                    >
                      <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">{day}</h3>
                      <div className="space-y-2">
                        {daySessions.map(({ slot, items }) => (
                          <div key={slot} className="space-y-1.5">
                            <div className="text-xs text-gray-400 font-medium">Slot {slot}</div>
                            {items.map((item, idx) => (
                              <motion.div
                                key={`${item.course.id}-${item.component.id}-${item.session.id}-${idx}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`text-xs p-2 sm:p-2.5 ${getSlotColor(item.component.component_type)} rounded-lg backdrop-blur-sm border`}
                              >
                                <div className="font-semibold text-white text-xs sm:text-sm">
                                  {item.course.code} ({item.component.component_type})
                                </div>
                                <div className="text-gray-200 text-xs mt-1 truncate">
                                  {item.course.name}
                                </div>
                                <div className="text-gray-300 text-xs mt-1">
                                  Term {item.term_number} • {item.class_code}
                                </div>
                                {item.session.room && (
                                  <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{item.session.room}</span>
                                  </div>
                                )}
                                {item.session.instructor && (
                                  <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
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
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="p-3 sm:p-4 text-left text-white font-semibold text-sm sm:text-base sticky left-0 bg-gray-900/95 z-10">Day / Slot</th>
                      {SLOTS.map((slot) => (
                        <th key={slot} className="p-3 sm:p-4 text-center text-white font-semibold text-sm sm:text-base min-w-[150px]">
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
                        <td className="p-3 sm:p-4 text-white font-semibold text-sm sm:text-base sticky left-0 bg-gray-900/95 z-10">{day}</td>
                        {SLOTS.map((slot) => {
                          const cellContent = getCellContent(day, slot);
                          return (
                            <td
                              key={slot}
                              className="p-2 min-w-[150px] h-auto border border-white/10 align-top"
                            >
                              {cellContent.length > 0 ? (
                                <div className="space-y-1">
                                  {cellContent.map((item, idx) => (
                                    <motion.div
                                      key={`${item.course.id}-${item.component.id}-${item.session.id}-${idx}`}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className={`text-xs p-1.5 sm:p-2 ${getSlotColor(item.component.component_type)} rounded-lg backdrop-blur-sm border`}
                                    >
                                      <div className="font-semibold text-white text-xs">
                                        {item.course.code} ({item.component.component_type})
                                      </div>
                                      <div className="text-gray-200 text-xs mt-1 truncate">
                                        {item.course.name}
                                      </div>
                                      <div className="text-gray-300 text-xs mt-1">
                                        Term {item.term_number} • {item.class_code}
                                      </div>
                                      {item.session.room && (
                                        <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
                                          <MapPin className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{item.session.room}</span>
                                        </div>
                                      )}
                                      {item.session.instructor && (
                                        <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
                                          <User className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{item.session.instructor}</span>
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
              </>
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
