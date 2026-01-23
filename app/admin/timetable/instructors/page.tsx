"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionsAPI } from "@/lib/api/timetable";
import { Calendar, ArrowLeft, User, BookOpen, MapPin, Clock, Download } from "lucide-react";
import jsPDF from "jspdf";

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
    is_elective?: boolean;
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
  const [downloadingPDF, setDownloadingPDF] = useState(false);

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
    const cellSessions = sessions.filter(session => session.day === day && session.slot === slot);
    
    // Deduplicate: Keep only one session per course code + component type combination
    const seen = new Set<string>();
    const uniqueSessions: InstructorSession[] = [];
    
    cellSessions.forEach(session => {
      const key = `${session.course.code}_${session.component.component_type}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSessions.push(session);
      }
    });
    
    return uniqueSessions;
  };

  // Color mapping matching site UI exactly (subtle, soft, embedded)
  const getPDFColor = (componentType: string) => {
    switch (componentType) {
      case "L":
        // Red - matching site: from-red-500/20 bg, border-red-500/50
        return {
          bg: [239, 68, 68, 0.2], // red-500 at 20% opacity
          border: [239, 68, 68, 0.5], // red-500 at 50% opacity
          text: [255, 255, 255], // White text
        };
      case "S":
        // Blue - matching site: from-blue-500/20 bg, border-blue-500/50
        return {
          bg: [59, 130, 246, 0.2], // blue-500 at 20% opacity
          border: [59, 130, 246, 0.5], // blue-500 at 50% opacity
          text: [255, 255, 255], // White text
        };
      case "LB":
        // Purple - matching site: from-purple-500/20 bg, border-purple-500/50
        return {
          bg: [168, 85, 247, 0.2], // purple-500 at 20% opacity
          border: [168, 85, 247, 0.5], // purple-500 at 50% opacity
          text: [255, 255, 255], // White text
        };
      default:
        return {
          bg: [239, 68, 68, 0.2],
          border: [239, 68, 68, 0.5],
          text: [255, 255, 255],
        };
    }
  };

  // Helper function to draw soft, embedded cell matching site UI
  const drawSoftCell = (
    doc: any,
    x: number,
    y: number,
    width: number,
    height: number,
    colors: any,
    text: string[],
    radius: number = 3
  ) => {
    // Dark base background (site uses dark background)
    doc.setFillColor(3, 7, 18); // Same as page background
    doc.roundedRect(x, y, width, height, radius, radius, "F");

    // Subtle colored background with opacity (matching site: /20 opacity)
    // jsPDF doesn't support RGBA directly, so we blend manually
    const bgR = Math.floor(colors.bg[0] * colors.bg[3] + 3 * (1 - colors.bg[3]));
    const bgG = Math.floor(colors.bg[1] * colors.bg[3] + 7 * (1 - colors.bg[3]));
    const bgB = Math.floor(colors.bg[2] * colors.bg[3] + 18 * (1 - colors.bg[3]));
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(x, y, width, height, radius, radius, "F");

    // Soft border matching site (50% opacity, thin)
    const borderR = Math.floor(colors.border[0] * colors.border[3] + 3 * (1 - colors.border[3]));
    const borderG = Math.floor(colors.border[1] * colors.border[3] + 7 * (1 - colors.border[3]));
    const borderB = Math.floor(colors.border[2] * colors.border[3] + 18 * (1 - colors.border[3]));
    doc.setDrawColor(borderR, borderG, borderB);
    doc.setLineWidth(0.5); // Thin, soft border
    doc.roundedRect(x, y, width, height, radius, radius, "D");

    // Text - course name bold and larger, other text normal
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    let textY = y + 5;
    text.forEach((line, idx) => {
      if (idx === 0) {
        // Course name - larger and bold
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        textY += 1; // Slight adjustment for larger font
      } else {
        // Other lines (component type, term, class, room) - normal size
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
      }
      doc.text(line, x + 2, textY, { maxWidth: width - 4 });
      textY += idx === 0 ? 6 : 4;
    });
  };

  const handleDownloadPDF = async () => {
    if (!selectedInstructor || sessions.length === 0) return;

    try {
      setDownloadingPDF(true);
      
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const tableWidth = pageWidth - (margin * 2);
      const cellWidth = tableWidth / 5;
      const cellHeight = 20;
      const headerHeight = 15;
      const rowHeight = cellHeight;

      // Dark background for entire page (#030712)
      doc.setFillColor(3, 7, 18);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Soft orange header with gradient effect (matching page theme)
      for (let i = 0; i < 30; i++) {
        const ratio = i / 30;
        // Orange/amber gradient
        const r = Math.floor(249 - ratio * 10);
        const g = Math.floor(115 - ratio * 5);
        const b = Math.floor(22 - ratio * 2);
        doc.setFillColor(r, g, b);
        doc.rect(0, i, pageWidth, 1, "F");
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(`Instructor Schedule`, margin, 15);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(selectedInstructor, margin, 22);
      
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(10);
      const uniqueCount = sessions.length;
      doc.text(`${uniqueCount} session${uniqueCount !== 1 ? 's' : ''} scheduled`, margin, 28);

      let yPos = 35;

      // Soft table header matching site
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, yPos, tableWidth, headerHeight, "F");
      
      // Subtle accent line (softer, thinner)
      doc.setFillColor(249, 115, 22); // Orange accent
      doc.rect(margin, yPos, 1.5, headerHeight, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Day / Slot", margin + 4, yPos + 10);
      
      SLOTS.forEach((slot, idx) => {
        doc.text(`Slot ${slot}`, margin + cellWidth + (idx * cellWidth) + (cellWidth / 2), yPos + 10, {
          align: "center",
        });
      });

      yPos += headerHeight;

      // Table rows
      DAYS.forEach((day) => {
        if (yPos + rowHeight > pageHeight - margin) {
          doc.addPage();
          doc.setFillColor(3, 7, 18);
          doc.rect(0, 0, pageWidth, pageHeight, "F");
          yPos = margin;
          
          doc.setFillColor(15, 23, 42);
          doc.rect(margin, yPos, tableWidth, headerHeight, "F");
          doc.setFillColor(249, 115, 22);
          doc.rect(margin, yPos, 1.5, headerHeight, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Day / Slot", margin + 4, yPos + 10);
          SLOTS.forEach((slot, idx) => {
            doc.text(`Slot ${slot}`, margin + cellWidth + (idx * cellWidth) + (cellWidth / 2), yPos + 10, {
              align: "center",
            });
          });
          yPos += headerHeight;
        }

        // Day cell - soft, embedded style
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, yPos, cellWidth, rowHeight, "F");
        
        // Subtle accent line (thinner, softer)
        doc.setFillColor(249, 115, 22);
        doc.rect(margin, yPos, 1.5, rowHeight, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(day, margin + 4, yPos + 12);

        // Slot cells with soft styling
        SLOTS.forEach((slot, slotIdx) => {
          const cellSessions = getCellContent(day, slot);
          const xPos = margin + cellWidth + (slotIdx * cellWidth);

          if (cellSessions.length > 0) {
            // Calculate height needed for multiple sessions
            const sessionHeight = Math.max(rowHeight, cellSessions.length * 18);
            
            cellSessions.forEach((session, sessionIdx) => {
              const sessionY = yPos + (sessionIdx * 18);
              const colors = getPDFColor(session.component.component_type);
              
              const textLines: string[] = [
                `${session.course.name} (${session.component.component_type})`
              ];
              textLines.push(`Term ${session.term.term_number} • ${session.class.class_code}`);
              if (session.room) textLines.push(`Room: ${session.room}`);
              if (session.course.is_elective) {
                textLines.push("Elective");
              }
              
              drawSoftCell(doc, xPos, sessionY, cellWidth, 17, colors, textLines);
            });
          } else {
            // Empty cell - dark
            doc.setFillColor(20, 20, 30);
            doc.rect(xPos, yPos, cellWidth, rowHeight, "F");
            doc.setDrawColor(40, 40, 50);
            doc.setLineWidth(0.5);
            doc.rect(xPos, yPos, cellWidth, rowHeight, "D");
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.text("-", xPos + (cellWidth / 2), yPos + 12, { align: "center" });
          }
        });

        yPos += rowHeight;
      });

      // Footer on all pages - dark with subtle text
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 120);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 5,
          { align: "right" }
        );
      }

      doc.save(`Instructor_Schedule_${selectedInstructor.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-500/30 to-amber-600/30 rounded-xl shadow-lg shadow-orange-500/20">
                  <Calendar className="w-7 h-7 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Schedule for {selectedInstructor}
                  </h2>
                  <p className="text-gray-400">
                    {(() => {
                      // Count unique sessions (deduplicated by course code + component type + day + slot)
                      const uniqueKeys = new Set<string>();
                      sessions.forEach(session => {
                        const key = `${session.course.code}_${session.component.component_type}_${session.day}_${session.slot}`;
                        uniqueKeys.add(key);
                      });
                      const uniqueCount = uniqueKeys.size;
                      return `${uniqueCount} session${uniqueCount !== 1 ? 's' : ''} scheduled`;
                    })()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF || !selectedInstructor || sessions.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-semibold shadow-lg shadow-orange-500/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                title="Download instructor schedule as PDF"
              >
                {downloadingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
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
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="font-semibold text-white">
                                          {session.course.code} ({session.component.component_type})
                                        </div>
                                        {session.course.is_elective && (
                                          <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 border border-purple-500/50 rounded text-[10px] font-semibold">
                                            Elective
                                          </span>
                                        )}
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
