"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, BookOpen, Clock, MapPin, User, ArrowLeft, X, Download } from "lucide-react";
import jsPDF from "jspdf";

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
  const [downloadingPDF, setDownloadingPDF] = useState<number | "all" | null>(null);
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

    // Text
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    let textY = y + 5;
    text.forEach((line, idx) => {
      doc.setFontSize(idx === 0 ? 8 : 7);
      doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
      doc.text(line, x + 2, textY, { maxWidth: width - 4 });
      textY += idx === 0 ? 5 : 4;
    });
  };

  const handleDownloadPDF = async (schedule: Schedule, scheduleIndex: number) => {
    try {
      setDownloadingPDF(scheduleIndex);
      
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

      // Neon purple header with gradient effect
      for (let i = 0; i < 30; i++) {
        const ratio = i / 30;
        const r = Math.floor(168 - ratio * 20);
        const g = Math.floor(85 - ratio * 10);
        const b = Math.floor(247 - ratio * 30);
        doc.setFillColor(r, g, b);
        doc.rect(0, i, pageWidth, 1, "F");
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(`Schedule Option ${scheduleIndex + 1}`, margin, 15);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Other Departments Section", margin, 22);
      
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(10);
      doc.text(`Days per week: ${schedule.totalDays} | Gaps: ${schedule.gaps}`, margin, 28);

      let yPos = 35;

      // Neon table header
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, yPos, tableWidth, headerHeight, "F");
      
      // Purple accent line
      doc.setFillColor(168, 85, 247);
      doc.rect(margin, yPos, 2, headerHeight, "F");
      
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
      DAYS.forEach((day, dayIdx) => {
        // Check if we need a new page
        if (yPos + rowHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          
          // Repeat header on new page
          doc.setFillColor(3, 7, 18);
          doc.rect(0, 0, pageWidth, pageHeight, "F");
          yPos = margin;
          
          doc.setFillColor(15, 23, 42);
          doc.rect(margin, yPos, tableWidth, headerHeight, "F");
          doc.setFillColor(168, 85, 247);
          doc.rect(margin, yPos, 2, headerHeight, "F");
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

        // Day cell - dark with neon accent
        const isExcluded = excludedDays.includes(day);
        doc.setFillColor(isExcluded ? 30 : 15, isExcluded ? 10 : 23, isExcluded ? 10 : 42);
        doc.rect(margin, yPos, cellWidth, rowHeight, "F");
        
        if (isExcluded) {
          doc.setFillColor(239, 68, 68);
          doc.rect(margin, yPos, 2, rowHeight, "F");
        } else {
          doc.setFillColor(168, 85, 247);
          doc.rect(margin, yPos, 2, rowHeight, "F");
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(day, margin + 4, yPos + 12);

        // Slot cells
        SLOTS.forEach((slot, slotIdx) => {
          const session = schedule.sessions.find(s => s.day === day && s.slot === slot);
          const xPos = margin + cellWidth + (slotIdx * cellWidth);

          if (session) {
            const colors = getPDFColor(session.component_type);
            const textLines: string[] = [
              `${session.course.name} (${session.component_type})`
            ];
            if (session.room) textLines.push(`Room: ${session.room}`);
            if (session.instructor) {
              const instructors = session.instructor.split(',').map(i => i.trim()).filter(i => i);
              if (instructors.length > 0) {
                textLines.push(instructors.length === 1 
                  ? `Instructor: ${instructors[0]}`
                  : `Instructors: ${instructors.join(', ')}`);
              }
            }
            drawSoftCell(doc, xPos, yPos, cellWidth, rowHeight, colors, textLines);
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

      // Courses & Classes Registration section
      if (schedule.courses && schedule.courses.length > 0) {
        yPos += 10;
        
        if (yPos + 40 > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFillColor(168, 85, 247);
        doc.rect(margin, yPos, tableWidth, 12, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Courses & Classes Registration", margin + 2, yPos + 8);

        yPos += 15;

        schedule.courses.forEach((courseData: any, idx: number) => {
          if (yPos + 20 > pageHeight - margin) {
            doc.addPage();
            doc.setFillColor(3, 7, 18);
            doc.rect(0, 0, pageWidth, pageHeight, "F");
            yPos = margin;
          }

          // Dark card with neon border
          doc.setFillColor(15, 23, 42);
          doc.roundedRect(margin, yPos, tableWidth, 18, 2, 2, "F");
          
          // Purple neon border
          doc.setDrawColor(168, 85, 247);
          doc.setLineWidth(1);
          doc.roundedRect(margin, yPos, tableWidth, 18, 2, 2, "D");
          
          // Purple accent line
          doc.setFillColor(168, 85, 247);
          doc.rect(margin, yPos, 2, 18, "F");

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(courseData.course.code, margin + 4, yPos + 7);

          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 200);
          doc.text(courseData.course.name, margin + 4, yPos + 12);

          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(168, 85, 247);
          doc.text(`Class: ${courseData.class.class_code}`, margin + 4, yPos + 17);

          yPos += 20;
        });
      }

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

      doc.save(`Schedule_Option_${scheduleIndex + 1}_Other_Departments.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(null);
    }
  };

  const handleDownloadAllPDFs = async () => {
    try {
      setDownloadingPDF("all");
      
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

      // Export all schedules into one PDF
      schedules.forEach((schedule, scheduleIndex) => {
        // Add new page for each schedule (except the first one)
        if (scheduleIndex > 0) {
          doc.addPage();
        }

        let yPos = margin;

        // Header for this schedule
        doc.setFillColor(168, 85, 247); // Purple
        doc.rect(0, 0, pageWidth, 30, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(`Schedule Option ${scheduleIndex + 1}`, margin, 15);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Other Departments Section", margin, 22);
        
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(10);
        doc.text(`Days per week: ${schedule.totalDays} | Gaps: ${schedule.gaps}`, margin, 28);

        yPos = 35;

        // Soft table header matching site
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, yPos, tableWidth, headerHeight, "F");
        
        // Subtle accent line (softer, thinner)
        doc.setFillColor(168, 85, 247);
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
          // Check if we need a new page
          if (yPos + rowHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            
            // Repeat header on new page
            doc.setFillColor(30, 30, 30);
            doc.rect(margin, yPos, tableWidth, headerHeight, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Day / Slot", margin + 2, yPos + 10);
            SLOTS.forEach((slot, idx) => {
              doc.text(`Slot ${slot}`, margin + cellWidth + (idx * cellWidth) + (cellWidth / 2), yPos + 10, {
                align: "center",
              });
            });
            yPos += headerHeight;
          }

          // Day cell - dark with neon accent
          const isExcluded = excludedDays.includes(day);
          doc.setFillColor(isExcluded ? 30 : 15, isExcluded ? 10 : 23, isExcluded ? 10 : 42);
          doc.rect(margin, yPos, cellWidth, rowHeight, "F");
          
          if (isExcluded) {
            doc.setFillColor(239, 68, 68);
            doc.rect(margin, yPos, 2, rowHeight, "F");
          } else {
            doc.setFillColor(168, 85, 247);
            doc.rect(margin, yPos, 2, rowHeight, "F");
          }
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(day, margin + 4, yPos + 12);

          // Slot cells with neon styling
          SLOTS.forEach((slot, slotIdx) => {
            const session = schedule.sessions.find(s => s.day === day && s.slot === slot);
            const xPos = margin + cellWidth + (slotIdx * cellWidth);

            if (session) {
              const colors = getPDFColor(session.component_type);
              const textLines: string[] = [
                `${session.course.name} (${session.component_type})`
              ];
              if (session.room) textLines.push(`Room: ${session.room}`);
              if (session.instructor) {
                const instructors = session.instructor.split(',').map(i => i.trim()).filter(i => i);
                if (instructors.length > 0) {
                  textLines.push(instructors.length === 1 
                    ? `Instructor: ${instructors[0]}`
                    : `Instructors: ${instructors.join(', ')}`);
                }
              }
              drawSoftCell(doc, xPos, yPos, cellWidth, rowHeight, colors, textLines);
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

        // Courses & Classes Registration section
        if (schedule.courses && schedule.courses.length > 0) {
          yPos += 10;
          
          if (yPos + 40 > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
          }

          doc.setFillColor(168, 85, 247);
          doc.rect(margin, yPos, tableWidth, 12, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("Courses & Classes Registration", margin + 2, yPos + 8);

          yPos += 15;

          schedule.courses.forEach((courseData: any) => {
            if (yPos + 20 > pageHeight - margin) {
              doc.addPage();
              doc.setFillColor(3, 7, 18);
              doc.rect(0, 0, pageWidth, pageHeight, "F");
              yPos = margin;
            }

            // Soft card matching site (embedded, not outlined)
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(margin, yPos, tableWidth, 18, 2, 2, "F");
            
            // Subtle border (softer, thinner)
            doc.setDrawColor(168, 85, 247);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, yPos, tableWidth, 18, 2, 2, "D");
            
            // Subtle accent line (thinner)
            doc.setFillColor(168, 85, 247);
            doc.rect(margin, yPos, 1.5, 18, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(courseData.course.code, margin + 4, yPos + 7);

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(200, 200, 200);
            doc.text(courseData.course.name, margin + 4, yPos + 12);

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(168, 85, 247);
            doc.text(`Class: ${courseData.class.class_code}`, margin + 4, yPos + 17);

            yPos += 20;
          });
        }
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

      doc.save(`All_Schedules_Other_Departments.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(null);
    }
  };

  const totalPages = Math.ceil(schedules.length / schedulesPerPage);
  const startIndex = (currentPage - 1) * schedulesPerPage;
  const endIndex = startIndex + schedulesPerPage;
  const currentSchedules = schedules.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg break-words">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
      <div className="w-full max-w-screen-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 md:mb-12"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 md:gap-6">
            <button
              onClick={() => router.push("/student/timetable/other")}
              className="p-2 sm:p-3 glass border border-white/10 rounded-xl hover:border-purple-500/50 hover:bg-white/5 transition-all flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <div className="p-3 sm:p-4 md:p-5 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-xl sm:rounded-2xl shadow-lg shadow-purple-500/20 flex-shrink-0">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 break-words leading-tight">
                Generated <span className="text-gradient">Schedules</span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base md:text-lg break-words">
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

        {/* Download All Button */}
        {schedules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6"
          >
            <button
              onClick={handleDownloadAllPDFs}
              disabled={downloadingPDF === "all" || loading}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm sm:text-base md:text-lg shadow-2xl shadow-green-500/50 hover:shadow-green-500/70 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 sm:gap-3 min-h-[44px] sm:min-h-[52px]"
            >
              {downloadingPDF === "all" ? (
                <>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-3 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                  <span className="break-words">Generating PDFs...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span className="break-words text-center">
                    Download All Schedules as Single PDF ({schedules.length} schedule{schedules.length !== 1 ? 's' : ''})
                  </span>
                </>
              )}
            </button>
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
                <button
                  onClick={() => handleDownloadPDF(schedule, globalIdx)}
                  disabled={downloadingPDF === globalIdx || downloadingPDF === "all" || loading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  title="Download this schedule as PDF"
                >
                  {downloadingPDF === globalIdx ? (
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
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-3 sm:mb-4 break-words">Courses in this schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  {schedule.courses.map((courseData, idx) => (
                    <div
                      key={idx}
                      className="p-3 sm:p-4 glass border border-white/10 rounded-lg sm:rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white mb-1 flex flex-wrap items-center gap-1 sm:gap-2">
                            <span className="break-words">{courseData.course.code}</span>
                            {courseData.course.is_elective && (
                              <span className="text-xs bg-purple-500/30 text-purple-300 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">
                                Elective
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-300 mb-1 sm:mb-2 break-words">
                            {courseData.course.name}
                          </div>
                          <div className="text-xs text-gray-400 break-words">
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
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 md:mt-10"
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 glass border border-white/10 rounded-xl font-semibold text-white hover:border-purple-500/50 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px]"
            >
              Previous
            </button>
            <span className="text-gray-400 text-sm sm:text-base whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 glass border border-white/10 rounded-xl font-semibold text-white hover:border-purple-500/50 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px]"
            >
              Next
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
