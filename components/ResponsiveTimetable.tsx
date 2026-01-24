"use client";

import { motion } from "framer-motion";
import { MapPin, User } from "lucide-react";

interface Session {
  day: string;
  slot: number;
  room: string | null;
  instructor: string | null;
  component_type: string;
  course: {
    name: string;
  };
}

interface ResponsiveTimetableProps {
  schedule: {
    sessions: Session[];
  };
  excludedDays?: string[];
  getSlotColor: (componentType: string) => string;
  index?: number;
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [1, 2, 3, 4];

export default function ResponsiveTimetable({ 
  schedule, 
  excludedDays = [], 
  getSlotColor,
  index = 0 
}: ResponsiveTimetableProps) {
  const getCellContent = (day: string, slot: number) => {
    const session = schedule.sessions.find(s => s.day === day && s.slot === slot);
    if (!session) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-xs sm:text-sm p-2 sm:p-2.5 ${getSlotColor(session.component_type)} rounded-lg backdrop-blur-sm border min-h-[60px] sm:min-h-[80px] flex flex-col justify-start`}
      >
        <div className="font-semibold text-white mb-1 break-words leading-tight">
          {session.course.name} ({session.component_type})
        </div>
        {session.room && (
          <div className="text-gray-300 text-xs flex items-start gap-1 mb-1">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="break-words">{session.room}</span>
          </div>
        )}
        {session.instructor && (
          <div className="text-gray-400 text-xs flex items-start gap-1 mt-auto">
            <User className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="break-words">{session.instructor}</span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      {/* Mobile View: Day Sections */}
      <div className="block md:hidden mb-4 sm:mb-6 space-y-4">
        {DAYS.map((day, dayIndex) => {
          const daySessions = schedule.sessions.filter(s => s.day === day);
          const isExcluded = excludedDays.includes(day);
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (index * 0.1) + (dayIndex * 0.02) }}
              className={`p-3 sm:p-4 rounded-lg border ${
                isExcluded 
                  ? "bg-red-500/10 border-red-500/30" 
                  : "bg-white/5 border-white/10"
              }`}
            >
              <h3 className={`text-base sm:text-lg font-bold mb-3 ${
                isExcluded ? "text-red-400" : "text-white"
              }`}>
                {day}
              </h3>
              <div className="space-y-2">
                {SLOTS.map((slot) => {
                  const session = schedule.sessions.find(s => s.day === day && s.slot === slot);
                  return (
                    <div key={slot} className="min-h-[60px]">
                      {session ? (
                        <div className={`p-2 sm:p-3 ${getSlotColor(session.component_type)} rounded-lg backdrop-blur-sm border`}>
                          <div className="font-semibold text-white mb-1 text-xs sm:text-sm break-words">
                            {session.course.name} ({session.component_type})
                          </div>
                          {session.room && (
                            <div className="text-gray-300 text-xs flex items-center gap-1 mb-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="break-words">{session.room}</span>
                            </div>
                          )}
                          {session.instructor && (
                            <div className="text-gray-400 text-xs flex items-start gap-1">
                              <User className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{session.instructor}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-600 text-xs text-center py-2">-</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block overflow-x-auto mb-4 sm:mb-6 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="p-3 sm:p-4 text-left text-white font-semibold text-sm sm:text-base sticky left-0 bg-gray-950/95 z-10">Day / Slot</th>
              {SLOTS.map((slot) => (
                <th key={slot} className="p-3 sm:p-4 text-center text-white font-semibold text-sm sm:text-base">
                  Slot {slot}
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
                <td className={`p-3 sm:p-4 text-white font-semibold text-sm sm:text-base sticky left-0 bg-gray-950/95 z-10 ${
                  excludedDays.includes(day) ? "text-red-400" : ""
                }`}>
                  {day}
                </td>
                {SLOTS.map((slot) => {
                  const cellContent = getCellContent(day, slot);
                  return (
                    <td
                      key={slot}
                      className="p-2 sm:p-3 min-w-[150px] sm:min-w-[180px] md:min-w-[200px] h-auto min-h-[80px] sm:min-h-[96px] border border-white/10 align-top"
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
    </>
  );
}
