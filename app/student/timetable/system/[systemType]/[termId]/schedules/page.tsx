"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, BookOpen, Clock, MapPin, User, Download, Users, ArrowLeft, X } from "lucide-react";
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
  const [downloadingPDF, setDownloadingPDF] = useState<number | "all" | null>(null);
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
        preferredInstructors: undefined,
        systemType,
      };

      setExcludedDays(preferences.excludedDays || []);

      const response = await studentTimetableAPI.generateSchedules({
        termId: termToken,
        excludedDays: preferences.excludedDays || [],
        electiveCourseIds: preferences.electiveCourseIds,
        excludedCoreCourseIds: preferences.excludedCoreCourseIds,
        preferredInstructors: preferences.preferredInstructors,
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

    // Text - course name bold and larger, instructor slightly larger
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    let textY = y + 5;
    text.forEach((line, idx) => {
      if (idx === 0) {
        // Course name - larger and bold
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        textY += 1; // Slight adjustment for larger font
      } else if (line.startsWith("Room:")) {
        // Room - normal size
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
      } else {
        // Instructor - slightly larger
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
      }
      doc.text(line, x + 2, textY, { maxWidth: width - 4 });
      textY += idx === 0 ? 6 : 4;
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

      // Teal header with gradient effect
      for (let i = 0; i < 30; i++) {
        const ratio = i / 30;
        const r = Math.floor(20 + ratio * 15);
        const g = Math.floor(184 - ratio * 20);
        const b = Math.floor(166 - ratio * 15);
        doc.setFillColor(r, g, b);
        doc.rect(0, i, pageWidth, 1, "F");
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(`Schedule Option ${scheduleIndex + 1}`, margin, 15);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`System ${systemType} - ${termNumber}`, margin, 22);
      
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(10);
      doc.text(`Days per week: ${schedule.totalDays} | Gaps: ${schedule.gaps}`, margin, 28);

      let yPos = 35;

      // Soft table header matching site
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, yPos, tableWidth, headerHeight, "F");
      
      // Subtle accent line (softer, thinner) - Teal
      doc.setFillColor(20, 184, 166);
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
          doc.setFillColor(20, 184, 166);
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

        // Day cell - soft, embedded style
        const isExcluded = excludedDays.includes(day);
        doc.setFillColor(isExcluded ? 30 : 15, isExcluded ? 10 : 23, isExcluded ? 10 : 42);
        doc.rect(margin, yPos, cellWidth, rowHeight, "F");
        
        // Subtle accent line (thinner, softer)
        if (isExcluded) {
          doc.setFillColor(239, 68, 68);
          doc.rect(margin, yPos, 1.5, rowHeight, "F");
        } else {
          doc.setFillColor(20, 184, 166);
          doc.rect(margin, yPos, 1.5, rowHeight, "F");
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

      // Courses & Classes Registration section - neon styled
      if (schedule.courses && schedule.courses.length > 0) {
        yPos += 10;
        
        if (yPos + 40 > pageHeight - margin) {
          doc.addPage();
          doc.setFillColor(3, 7, 18);
          doc.rect(0, 0, pageWidth, pageHeight, "F");
          yPos = margin;
        }

        // Neon cyan header
        doc.setFillColor(6, 182, 212);
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
          
          // Subtle border (softer, thinner) - Teal
          doc.setDrawColor(20, 184, 166);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, yPos, tableWidth, 18, 2, 2, "D");
          
          // Subtle accent line (thinner) - Teal
          doc.setFillColor(20, 184, 166);
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
          doc.setTextColor(20, 184, 166);
          doc.text(`Class: ${courseData.class.class_code}`, margin + 4, yPos + 17);

          yPos += 20;
        });
      }

      // Footer - dark with subtle text
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
        // Designer credit at bottom left - gradient color with neon effect
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        // Add subtle glow effect by drawing text with slight offset in lighter color
        doc.setTextColor(100, 200, 255); // Lighter cyan for glow
        doc.text(
          "DESIGNED BY MAHMOUD HAISAM",
          margin + 0.2,
          pageHeight - 5 + 0.2,
          { align: "left" }
        );
        // Main text with gradient-like color (cyan-400: rgb(34, 211, 238))
        doc.setTextColor(34, 211, 238); // cyan-400 - matches system number gradient
        doc.text(
          "DESIGNED BY MAHMOUD HAISAM",
          margin,
          pageHeight - 5,
          { align: "left" }
        );
      }

      doc.save(`Schedule_Option_${scheduleIndex + 1}_System_${systemType}_${termNumber}.pdf`);
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

      // Export all schedules into one PDF with neon styling
      schedules.forEach((schedule, scheduleIndex) => {
        // Add new page for each schedule (except the first one)
        if (scheduleIndex > 0) {
          doc.addPage();
        }

        // Dark background for entire page
        doc.setFillColor(3, 7, 18);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        let yPos = margin;

        // Teal header with gradient effect
        for (let i = 0; i < 30; i++) {
          const ratio = i / 30;
          const r = Math.floor(20 + ratio * 15);
          const g = Math.floor(184 - ratio * 20);
          const b = Math.floor(166 - ratio * 15);
          doc.setFillColor(r, g, b);
          doc.rect(0, i, pageWidth, 1, "F");
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(`Schedule Option ${scheduleIndex + 1}`, margin, 15);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`System ${systemType} - ${termNumber}`, margin, 22);
        
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(10);
        doc.text(`Days per week: ${schedule.totalDays} | Gaps: ${schedule.gaps}`, margin, 28);

        yPos = 35;

        // Soft table header matching site
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, yPos, tableWidth, headerHeight, "F");
        
        // Subtle accent line (softer, thinner) - Teal
        doc.setFillColor(20, 184, 166);
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
            doc.setFillColor(20, 184, 166);
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

          // Day cell - soft, embedded style
          const isExcluded = excludedDays.includes(day);
          doc.setFillColor(isExcluded ? 30 : 15, isExcluded ? 10 : 23, isExcluded ? 10 : 42);
          doc.rect(margin, yPos, cellWidth, rowHeight, "F");
          
          // Subtle accent line (thinner, softer)
          if (isExcluded) {
            doc.setFillColor(239, 68, 68);
            doc.rect(margin, yPos, 1.5, rowHeight, "F");
          } else {
            doc.setFillColor(20, 184, 166);
            doc.rect(margin, yPos, 1.5, rowHeight, "F");
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

        // Courses & Classes Registration section - neon styled
        if (schedule.courses && schedule.courses.length > 0) {
          yPos += 10;
          
          if (yPos + 40 > pageHeight - margin) {
            doc.addPage();
            doc.setFillColor(3, 7, 18);
            doc.rect(0, 0, pageWidth, pageHeight, "F");
            yPos = margin;
          }

          // Teal header
          doc.setFillColor(20, 184, 166);
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
            doc.setDrawColor(6, 182, 212);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, yPos, tableWidth, 18, 2, 2, "D");
            
            // Subtle accent line (thinner)
            doc.setFillColor(6, 182, 212);
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
            doc.setTextColor(6, 182, 212);
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
        // Designer credit at bottom left - gradient color with neon effect
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        // Add subtle glow effect by drawing text with slight offset in lighter color
        doc.setTextColor(100, 200, 255); // Lighter cyan for glow
        doc.text(
          "DESIGNED BY MAHMOUD HAISAM",
          margin + 0.2,
          pageHeight - 5 + 0.2,
          { align: "left" }
        );
        // Main text with gradient-like color (cyan-400: rgb(34, 211, 238))
        doc.setTextColor(34, 211, 238); // cyan-400 - matches system number gradient
        doc.text(
          "DESIGNED BY MAHMOUD HAISAM",
          margin,
          pageHeight - 5,
          { align: "left" }
        );
      }

      doc.save(`All_Schedules_System_${systemType}_${termNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(null);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-base sm:text-lg md:text-xl break-words">Generating schedules...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-screen-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <button
            onClick={() => router.push(`/student/timetable/system/${systemType}/${termToken}`)}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-3 sm:mb-4 transition-colors group text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0" />
            <span className="break-words">Back to Preferences</span>
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-xl shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 break-words leading-tight">
                Generated Schedules - System {systemType}
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm break-words">
                Found <span className="text-cyan-400 font-bold">{schedules.length}</span> schedule{schedules.length !== 1 ? 's' : ''} matching your preferences
              </p>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm sm:text-base break-words"
          >
            {error}
          </motion.div>
        )}

        {schedules.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass border border-white/10 rounded-xl p-6 sm:p-8 md:p-12 text-center shadow-xl"
          >
            <div className="p-3 sm:p-4 bg-gray-500/20 rounded-xl w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 opacity-50" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 break-words">No Schedules Found</h3>
            <p className="text-gray-400 mb-2 text-sm sm:text-base break-words">
              No schedules found matching your preferences.
            </p>
            <p className="text-gray-500 text-xs sm:text-sm break-words">
              Try adjusting your excluded days or elective courses.
            </p>
            <button
              onClick={() => router.push(`/student/timetable/system/${systemType}/${termToken}`)}
              className="mt-4 sm:mt-6 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:scale-105 transition-all text-sm sm:text-base min-h-[44px]"
            >
              Go Back to Preferences
            </button>
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

        {/* Pagination */}
        {schedules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-white/10 rounded-xl p-3 sm:p-4 md:p-5 mb-4 sm:mb-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="text-white text-xs sm:text-sm md:text-base break-words min-w-0">
                <span className="font-bold">
                  Showing {((currentPage - 1) * schedulesPerPage) + 1} - {Math.min(currentPage * schedulesPerPage, schedules.length)}
                </span>
                <span className="text-gray-400"> of {schedules.length} schedules</span>
                <span className="text-gray-500 text-xs sm:text-sm block sm:inline sm:ml-2 mt-1 sm:mt-0">(Sorted by quality: best first)</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 glass border border-white/10 rounded-lg text-white hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs sm:text-sm min-h-[44px] sm:min-h-auto"
                >
                  Previous
                </button>
                <span className="px-3 sm:px-4 py-2 text-white font-bold min-w-[80px] sm:min-w-[100px] text-center bg-white/5 rounded-lg text-xs sm:text-sm">
                  Page {currentPage} of {Math.ceil(schedules.length / schedulesPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(schedules.length / schedulesPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(schedules.length / schedulesPerPage)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 glass border border-white/10 rounded-lg text-white hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs sm:text-sm min-h-[44px] sm:min-h-auto"
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
                className="glass border border-white/10 rounded-xl p-3 sm:p-4 md:p-6 overflow-hidden mb-4 sm:mb-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-cyan-500/20 rounded-lg flex-shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-6 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 flex flex-wrap items-center gap-2 break-words">
                        <span>Schedule Option {globalIndex + 1}</span>
                        {globalIndex === 0 && (
                          <span className="text-xs sm:text-sm text-cyan-400 font-normal whitespace-nowrap">⭐ Best</span>
                        )}
                        {schedule.excludedDaysUsed === 0 && schedule.totalDays <= 3 && schedule.gaps <= 2 && (
                          <span className="text-xs sm:text-sm text-green-400 font-normal whitespace-nowrap">✨ Excellent</span>
                        )}
                      </h2>
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{schedule.totalDays} day(s) per week</span>
                        </div>
                        {schedule.excludedDaysUsed > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400 whitespace-nowrap">
                            <X className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span>{schedule.excludedDaysUsed} excluded day(s) used</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{schedule.gaps} gap(s)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadPDF(schedule, globalIndex)}
                    disabled={downloadingPDF === globalIndex || downloadingPDF === "all" || loading}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                    title="Download this schedule as PDF"
                  >
                    {downloadingPDF === globalIndex ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Download PDF</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Timetable Grid - Mobile: Day sections, Desktop: Table */}
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
                            const cellContent = getCellContent(schedule, day, slot);
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
