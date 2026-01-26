"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, BookOpen, Clock, MapPin, User, Download, Users, ArrowLeft, X } from "lucide-react";
import AlertModal from "@/components/ui/AlertModal";

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

export default function SchedulesPage() {
  const params = useParams();
  const router = useRouter();
  const termToken = params.termId as string; // Now using token instead of ID

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);
  const [termNumber, setTermNumber] = useState<string>("");
  const [downloadingPDF, setDownloadingPDF] = useState<number | "all" | null>(null);
  const schedulesPerPage = 5;
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  useEffect(() => {
    if (termToken) {
      // Load term number from sessionStorage (using token as key)
      const storedTermNumber = sessionStorage.getItem(`term_number_${termToken}`);
      if (storedTermNumber) {
        setTermNumber(storedTermNumber);
      } else {
        setTermNumber("Term");
      }
      loadSchedules();
    }
  }, [termToken]);

  const loadSchedules = async () => {
    if (!termToken) return;

    try {
      setLoading(true);
      setError(null);

      // Get preferences from sessionStorage (using token as key)
      const preferencesStr = sessionStorage.getItem(`timetable_preferences_${termToken}`);
      const preferences = preferencesStr ? JSON.parse(preferencesStr) : {
        excludedDays: [],
        electiveCourseIds: undefined,
        excludedCoreCourseIds: undefined,
      };

      setExcludedDays(preferences.excludedDays || []);

      const response = await studentTimetableAPI.generateSchedules({
        termId: termToken, // Send token instead of ID
        excludedDays: preferences.excludedDays || [],
        electiveCourseIds: preferences.electiveCourseIds,
        excludedCoreCourseIds: preferences.excludedCoreCourseIds,
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

  const handleDownloadPDF = async (schedule: Schedule, scheduleIndex: number) => {
    try {
      setDownloadingPDF(scheduleIndex);
      const jsPDF = (await import("jspdf")).default;
      await import("jspdf-autotable");

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Dark background for entire page (#030712)
      doc.setFillColor(3, 7, 18);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Neon header with gradient effect
      const headerHeight = 28;
      for (let i = 0; i < headerHeight; i++) {
        const ratio = i / headerHeight;
        const r = Math.floor(6 + ratio * 20);
        const g = Math.floor(182 - ratio * 30);
        const b = Math.floor(212 - ratio * 40);
        doc.setFillColor(r, g, b);
        doc.rect(0, i, pageWidth, 1, "F");
      }

      doc.setDrawColor(167, 243, 208);
      doc.setLineWidth(0.5);
      doc.line(0, headerHeight, pageWidth, headerHeight);

      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Student Timetable", 14, 17);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255);

      const termNum = termNumber || "Term";
      doc.setFillColor(255, 255, 255);
      doc.rect(14, 21, 25, 6, "F");
      doc.setTextColor(6, 182, 212);
      doc.setFont("helvetica", "bold");
      doc.text(`Term ${termNum}`, 16.5, 24.5);

      doc.setFillColor(167, 243, 208);
      doc.rect(42, 21, 35, 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(`Schedule Option ${scheduleIndex + 1}`, 44, 24.5);

      let statsY = 32;
      const statsWidth = pageWidth - 20;
      const statsHeight = 12;

      doc.setFillColor(30, 41, 59);
      doc.rect(10, statsY - 2, statsWidth, statsHeight, "F");

      doc.setDrawColor(167, 243, 208);
      doc.setLineWidth(0.5);
      doc.rect(10, statsY - 2, statsWidth, statsHeight, "D");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(167, 243, 208);

      doc.setFillColor(6, 182, 212);
      doc.rect(14, statsY, 30, 5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(`${schedule.totalDays}`, 16, statsY + 3.2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`day(s)/week`, 22, statsY + 3.2);

      if (schedule.gaps > 0) {
        doc.setFillColor(59, 130, 246);
        doc.rect(48, statsY, 25, 5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(`${schedule.gaps}`, 50, statsY + 3.2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`gap(s)`, 55, statsY + 3.2);
      }

      if (schedule.excludedDaysUsed > 0) {
        doc.setFillColor(251, 191, 36);
        doc.rect(77, statsY, 35, 5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`${schedule.excludedDaysUsed} excluded`, 79, statsY + 3.2);
      }

      statsY += 8;

      const tableData: any[][] = [];
      const DAYS_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
      const SLOTS_ORDER = [1, 2, 3, 4];

      const headers = ["Time", ...DAYS_ORDER];

      SLOTS_ORDER.forEach((slot) => {
        const row: any[] = [`Slot ${slot}`];

        DAYS_ORDER.forEach((day) => {
          const session = schedule.sessions.find(
            (s) => s.day === day && s.slot === slot
          );

          if (session) {
            const componentType = session.component_type === "L" ? "Lec" : session.component_type === "S" ? "Sec" : "Lab";
            // Use course name instead of code, make it bold and larger
            let cellText = `${session.course.name}\n${componentType}`;
            if (session.room) {
              cellText += `\n${session.room}`;
            }
            if (session.instructor) {
              // Handle multiple instructors (comma-separated)
              const instructors = session.instructor.split(',').map(i => i.trim()).filter(i => i);
              if (instructors.length > 0) {
                cellText += `\n${instructors.length === 1 ? instructors[0] : instructors.join(', ')}`;
              }
            }
            row.push(cellText);
          } else {
            row.push("");
          }
        });

        tableData.push(row);
      });

      const tableStartY = statsY + 5;

      doc.setDrawColor(167, 243, 208);
      doc.setLineWidth(0.5);
      doc.line(10, tableStartY - 3, pageWidth - 10, tableStartY - 3);

      (doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: tableStartY,
        theme: "grid",
        headStyles: {
          fillColor: [15, 23, 42], // Dark slate
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
          lineColor: [6, 182, 212], // Neon cyan
          lineWidth: 1,
        },
        bodyStyles: {
          fillColor: [20, 20, 30], // Very dark
          textColor: [255, 255, 255],
          fontSize: 9, // Larger base font for course names
          halign: "center",
          valign: "middle",
          lineColor: [40, 40, 50], // Dark borders
          lineWidth: 0.5,
          fontStyle: "bold", // Make course name bold
        },
        alternateRowStyles: {
          fillColor: [15, 23, 42], // Slightly lighter dark
        },
        columnStyles: {
          0: {
            fillColor: [15, 23, 42],
            textColor: [6, 182, 212], // Neon cyan text
            fontStyle: "bold",
            halign: "center",
            cellWidth: 32,
            lineColor: [6, 182, 212], // Neon cyan border
            lineWidth: 1,
          },
        },
        styles: {
          cellPadding: 4,
          lineWidth: 0.5,
          lineColor: [203, 213, 225],
        },
        didParseCell: (data: any) => {
          if (data.row.index > 0 && data.column.index > 0) {
            const cellText = data.cell.text[0];
            if (cellText && cellText.includes("\n")) {
              const lines = cellText.split("\n");
              // First line is course name - make it bold and larger
              data.cell.styles.fontSize = 9.5;
              data.cell.styles.fontStyle = "bold";
              
              if (lines[1]) {
                const componentType = lines[1];
                if (componentType === "Lec") {
                  // Red - matching site: from-red-500/20 bg, border-red-500/50
                  data.cell.styles.fillColor = [239, 68, 68, 0.2]; // red-500 at 20%
                  data.cell.styles.textColor = [255, 255, 255];
                  data.cell.styles.lineColor = [239, 68, 68, 0.5]; // red-500 at 50%
                  data.cell.styles.lineWidth = 0.5; // Softer, thinner
                } else if (componentType === "Sec") {
                  // Blue - matching site: from-blue-500/20 bg, border-blue-500/50
                  data.cell.styles.fillColor = [59, 130, 246, 0.2]; // blue-500 at 20%
                  data.cell.styles.textColor = [255, 255, 255];
                  data.cell.styles.lineColor = [59, 130, 246, 0.5]; // blue-500 at 50%
                  data.cell.styles.lineWidth = 0.5; // Softer, thinner
                } else if (componentType === "Lab") {
                  // Purple - matching site: from-purple-500/20 bg, border-purple-500/50
                  data.cell.styles.fillColor = [168, 85, 247, 0.2]; // purple-500 at 20%
                  data.cell.styles.textColor = [255, 255, 255];
                  data.cell.styles.lineColor = [168, 85, 247, 0.5]; // purple-500 at 50%
                  data.cell.styles.lineWidth = 0.5; // Softer, thinner
                }
              }
            }
          }
        },
      });

      let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 100;

      // Softer divider line
      doc.setDrawColor(6, 182, 212, 0.3);
      doc.setLineWidth(0.5);
      doc.line(10, finalY - 2, pageWidth - 10, finalY - 2);

      const estimatedCoursesHeight = 20 + (schedule.courses.length * 12);
      if (finalY + estimatedCoursesHeight > pageHeight - 20) {
        doc.addPage();
        doc.setFillColor(3, 7, 18);
        doc.rect(0, 0, pageWidth, pageHeight, "F");
        finalY = 20;
      }

      const coursesSectionHeight = Math.min(20 + (schedule.courses.length * 12), pageHeight - finalY - 10);

      // Soft background for courses section
      doc.setFillColor(15, 23, 42);
      doc.rect(8, finalY - 4, pageWidth - 16, coursesSectionHeight + 6, "F");

      // Subtle border (softer, thinner)
      doc.setDrawColor(6, 182, 212);
      doc.setLineWidth(0.5);
      doc.rect(10, finalY - 2, pageWidth - 20, coursesSectionHeight + 2, "D");

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(167, 243, 208);
      doc.text("Courses in this schedule:", 14, finalY + 1);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      let yPos = finalY + 8;

      const sortedCourses = [...schedule.courses].sort((a, b) =>
        a.course.code.localeCompare(b.course.code)
      );

      sortedCourses.forEach((courseData, idx) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          for (let i = 0; i < gradientSteps; i++) {
            const color = [
              Math.floor(3 + (i / gradientSteps) * 10),
              Math.floor(7 + (i / gradientSteps) * 15),
              Math.floor(18 + (i / gradientSteps) * 25)
            ];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(0, (i / gradientSteps) * pageHeight, pageWidth, pageHeight / gradientSteps, "F");
          }

          const remainingCourses = sortedCourses.length - idx;
          const remainingHeight = Math.min(20 + (remainingCourses * 12), pageHeight - 20);
          doc.setFillColor(51, 65, 85);
          doc.rect(10, 15, pageWidth - 20, remainingHeight, "F");
          doc.setDrawColor(167, 243, 208);
          doc.setLineWidth(0.5);
          doc.rect(10, 15, pageWidth - 20, remainingHeight, "D");

          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(167, 243, 208);
          doc.text("Courses (continued):", 14, 22);

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          yPos = 28;
        }

        const cardHeight = 10;
        const cardX = 14;
        const cardWidth = pageWidth - 28;

        doc.setFillColor(30, 41, 59);
        doc.rect(cardX, yPos - 3, cardWidth, cardHeight, "F");

        doc.setDrawColor(167, 243, 208);
        doc.setLineWidth(0.3);
        doc.rect(cardX, yPos - 3, cardWidth, cardHeight, "D");

        const accentColor = [
          [6, 182, 212],
          [59, 130, 246],
          [168, 85, 247]
        ][idx % 3];
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(cardX, yPos - 3, 2, cardHeight, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        const courseText = `${courseData.course.code} - ${courseData.course.name}`;
        const maxWidth = cardWidth - 8;
        const lines = doc.splitTextToSize(courseText, maxWidth);
        doc.text(lines, cardX + 5, yPos + 1);
        yPos += lines.length * 4.5;

        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(cardX + 5, yPos - 1, 35, 4.5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(167, 243, 208);
        doc.text("Class:", cardX + 7, yPos + 1.5);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(courseData.class.class_code, cardX + 18, yPos + 1.5);

        yPos += 7;
      });

      const fileName = `Timetable_Term${termNum}_Schedule${scheduleIndex + 1}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "PDF Export Failed",
        message: error.message || "Failed to generate PDF. Please try again.",
      });
    } finally {
      setDownloadingPDF(null);
    }
  };

  const handleDownloadAllPDFs = async () => {
    try {
      setDownloadingPDF("all");
      const jsPDF = (await import("jspdf")).default;
      await import("jspdf-autotable");

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const termNum = termNumber || "Term";
      const gradientSteps = 20;

      // Export all schedules into one PDF
      schedules.forEach((schedule, scheduleIndex) => {
        // Add new page for each schedule (except the first one)
        if (scheduleIndex > 0) {
          doc.addPage();
        }

        // Dark background for entire page
        doc.setFillColor(3, 7, 18);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        // Neon header with gradient effect
        const headerHeight = 28;
        for (let i = 0; i < headerHeight; i++) {
          const ratio = i / headerHeight;
          const r = Math.floor(6 + ratio * 20);
          const g = Math.floor(182 - ratio * 30);
          const b = Math.floor(212 - ratio * 40);
          doc.setFillColor(r, g, b);
          doc.rect(0, i, pageWidth, 1, "F");
        }

        doc.setDrawColor(167, 243, 208);
        doc.setLineWidth(0.5);
        doc.line(0, headerHeight, pageWidth, headerHeight);

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Student Timetable", 14, 17);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(255, 255, 255);

        doc.setFillColor(15, 23, 42);
        doc.rect(14, 21, 25, 6, "F");
        doc.setDrawColor(6, 182, 212);
        doc.setLineWidth(1);
        doc.rect(14, 21, 25, 6, "D");
        doc.setTextColor(6, 182, 212);
        doc.setFont("helvetica", "bold");
        doc.text(`Term ${termNum}`, 16.5, 24.5);

        doc.setFillColor(6, 182, 212);
        doc.rect(42, 21, 35, 6, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(`Schedule Option ${scheduleIndex + 1}`, 44, 24.5);

        let statsY = 32;
        const statsWidth = pageWidth - 20;
        const statsHeight = 12;

        doc.setFillColor(15, 23, 42);
        doc.rect(10, statsY - 2, statsWidth, statsHeight, "F");

        doc.setDrawColor(6, 182, 212);
        doc.setLineWidth(1);
        doc.rect(10, statsY - 2, statsWidth, statsHeight, "D");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(167, 243, 208);

        doc.setFillColor(6, 182, 212);
        doc.rect(14, statsY, 30, 5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(`${schedule.totalDays}`, 16, statsY + 3.2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`day(s)/week`, 22, statsY + 3.2);

        if (schedule.gaps > 0) {
          doc.setFillColor(59, 130, 246);
          doc.rect(48, statsY, 25, 5, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text(`${schedule.gaps}`, 50, statsY + 3.2);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(`gap(s)`, 55, statsY + 3.2);
        }

        if (schedule.excludedDaysUsed > 0) {
          doc.setFillColor(251, 191, 36);
          doc.rect(77, statsY, 35, 5, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`${schedule.excludedDaysUsed} excluded`, 79, statsY + 3.2);
        }

        statsY += 8;

        const tableData: any[][] = [];
        const DAYS_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
        const SLOTS_ORDER = [1, 2, 3, 4];

        const headers = ["Time", ...DAYS_ORDER];

        SLOTS_ORDER.forEach((slot) => {
          const row: any[] = [`Slot ${slot}`];

          DAYS_ORDER.forEach((day) => {
            const session = schedule.sessions.find(
              (s) => s.day === day && s.slot === slot
            );

            if (session) {
              const componentType = session.component_type === "L" ? "Lec" : session.component_type === "S" ? "Sec" : "Lab";
              // Use course name instead of code
              let cellText = `${session.course.name}\n${componentType}`;
              if (session.room) {
                cellText += `\n${session.room}`;
              }
              if (session.instructor) {
                const instructors = session.instructor.split(',').map(i => i.trim()).filter(i => i);
                if (instructors.length > 0) {
                  cellText += `\n${instructors.length === 1 ? instructors[0] : instructors.join(', ')}`;
                }
              }
              row.push(cellText);
            } else {
              row.push("");
            }
          });

          tableData.push(row);
        });

        const tableStartY = statsY + 5;

        doc.setDrawColor(167, 243, 208);
        doc.setLineWidth(0.5);
        doc.line(10, tableStartY - 3, pageWidth - 10, tableStartY - 3);

        (doc as any).autoTable({
          head: [headers],
          body: tableData,
          startY: tableStartY,
          theme: "grid",
          headStyles: {
            fillColor: [6, 182, 212],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
            lineColor: [167, 243, 208],
            lineWidth: 0.5,
          },
          bodyStyles: {
            fillColor: [255, 255, 255, 0.06],
            textColor: [226, 232, 240],
            fontSize: 8.5,
            halign: "center",
            valign: "middle",
            lineColor: [203, 213, 225, 0.3],
            lineWidth: 0.3,
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255, 0.1],
          },
          columnStyles: {
            0: {
              fillColor: [6, 182, 212, 0.25],
              textColor: [167, 243, 208],
              fontStyle: "bold",
              halign: "center",
              cellWidth: 32,
              lineColor: [167, 243, 208, 0.5],
            },
          },
          styles: {
            cellPadding: 4,
            lineWidth: 0.5,
            lineColor: [203, 213, 225],
          },
          didParseCell: (data: any) => {
            if (data.row.index > 0 && data.column.index > 0) {
              const cellText = data.cell.text[0];
              if (cellText && cellText.includes("\n")) {
                const lines = cellText.split("\n");
                if (lines[1]) {
                  const componentType = lines[1];
                  if (componentType === "Lec") {
                    data.cell.styles.fillColor = [6, 182, 212, 0.35];
                    data.cell.styles.textColor = [167, 243, 208];
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fontSize = 9;
                    data.cell.styles.lineColor = [6, 182, 212, 0.5];
                    data.cell.styles.lineWidth = 0.4;
                  } else if (componentType === "Sec") {
                    data.cell.styles.fillColor = [59, 130, 246, 0.35];
                    data.cell.styles.textColor = [147, 197, 253];
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fontSize = 9;
                    data.cell.styles.lineColor = [59, 130, 246, 0.5];
                    data.cell.styles.lineWidth = 0.4;
                  } else if (componentType === "Lab") {
                    data.cell.styles.fillColor = [168, 85, 247, 0.35];
                    data.cell.styles.textColor = [196, 181, 253];
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fontSize = 9;
                    data.cell.styles.lineColor = [168, 85, 247, 0.5];
                    data.cell.styles.lineWidth = 0.4;
                  }
                }
              }
            }
          },
        });

        let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 100;

        // Softer divider line
        doc.setDrawColor(6, 182, 212, 0.3);
        doc.setLineWidth(0.5);
        doc.line(10, finalY - 2, pageWidth - 10, finalY - 2);

        const estimatedCoursesHeight = 20 + (schedule.courses.length * 12);
        if (finalY + estimatedCoursesHeight > pageHeight - 20) {
          doc.addPage();
          doc.setFillColor(3, 7, 18);
          doc.rect(0, 0, pageWidth, pageHeight, "F");
          finalY = 20;
        }

        const coursesSectionHeight = Math.min(20 + (schedule.courses.length * 12), pageHeight - finalY - 10);

        // Dark background for courses section
        doc.setFillColor(15, 23, 42);
        doc.rect(8, finalY - 4, pageWidth - 16, coursesSectionHeight + 6, "F");

        // Neon cyan border
        doc.setDrawColor(6, 182, 212);
        doc.setLineWidth(1);
        doc.rect(10, finalY - 2, pageWidth - 20, coursesSectionHeight + 2, "D");

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(6, 182, 212);
        doc.text("Courses in this schedule:", 14, finalY + 1);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        let yPos = finalY + 8;

        const sortedCourses = [...schedule.courses].sort((a, b) =>
          a.course.code.localeCompare(b.course.code)
        );

        sortedCourses.forEach((courseData, idx) => {
          if (yPos > pageHeight - 25) {
            doc.addPage();
            doc.setFillColor(3, 7, 18);
            doc.rect(0, 0, pageWidth, pageHeight, "F");

            const remainingCourses = sortedCourses.length - idx;
            const remainingHeight = Math.min(20 + (remainingCourses * 12), pageHeight - 20);
            doc.setFillColor(15, 23, 42);
            doc.rect(10, 15, pageWidth - 20, remainingHeight, "F");
            doc.setDrawColor(6, 182, 212);
            doc.setLineWidth(1);
            doc.rect(10, 15, pageWidth - 20, remainingHeight, "D");

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(6, 182, 212);
            doc.text("Courses (continued):", 14, 22);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            yPos = 28;
          }

          const cardHeight = 10;
          const cardX = 14;
          const cardWidth = pageWidth - 28;

          // Soft card matching site (embedded, not outlined)
          doc.setFillColor(15, 23, 42);
          doc.rect(cardX, yPos - 3, cardWidth, cardHeight, "F");

          // Subtle border (softer, thinner)
          doc.setDrawColor(6, 182, 212);
          doc.setLineWidth(0.5);
          doc.rect(cardX, yPos - 3, cardWidth, cardHeight, "D");

          // Subtle accent line (thinner)
          doc.setFillColor(6, 182, 212);
          doc.rect(cardX, yPos - 3, 1.5, cardHeight, "F");

          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          const courseText = `${courseData.course.code} - ${courseData.course.name}`;
          const maxWidth = cardWidth - 8;
          const lines = doc.splitTextToSize(courseText, maxWidth);
          doc.text(lines, cardX + 5, yPos + 1);
          yPos += lines.length * 4.5;

          doc.setFillColor(6, 182, 212);
          doc.rect(cardX + 5, yPos - 1, 35, 4.5, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(6, 182, 212);
          doc.text("Class:", cardX + 7, yPos + 1.5);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(courseData.class.class_code, cardX + 18, yPos + 1.5);

          yPos += 7;
        });
      });

      // Footer on all pages - dark with subtle text
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Ensure dark background on all pages
        doc.setFillColor(3, 7, 18);
        doc.rect(0, pageHeight - 10, pageWidth, 10, "F");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 120);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - 10,
          pageHeight - 5,
          { align: "right" }
        );
      }

      doc.save(`All_Schedules_Term_${termNum}.pdf`);
      
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "PDF Generated",
        message: `Successfully generated single PDF file with all ${schedules.length} schedule(s).`,
      });
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "PDF Export Failed",
        message: error.message || "Failed to generate PDF. Please try again.",
      });
    } finally {
      setDownloadingPDF(null);
    }
  };

  const getSlotColor = (componentType: string) => {
    switch (componentType) {
      case "L":
        // Lecture - Red
        return "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/50";
      case "S":
        // Section - Blue (matching Other section)
        return "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50";
      case "LB":
        // Lab - Purple (matching Other section)
        return "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/50";
      default:
        return "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/50";
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
            onClick={() => router.push(`/student/timetable/${termToken}`)}
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
                Generated Schedules
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
              onClick={() => router.push(`/student/timetable/${termToken}`)}
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
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                    <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2 break-words">
                      <BookOpen className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>Courses & Classes Registration</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {schedule.courses.map((courseData: any, idx: number) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (index * 0.1) + (idx * 0.05) }}
                          className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-semibold text-xs sm:text-sm mb-1 break-words">
                                {courseData.course.code}
                              </div>
                              <div className="text-gray-300 text-xs mb-2 break-words">
                                {courseData.course.name}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-gray-400 text-xs">Class:</span>
                                <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-300 text-xs font-semibold whitespace-nowrap">
                                  {courseData.class.class_code}
                                </span>
                              </div>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-cyan-500/20 rounded-lg flex-shrink-0">
                              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
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

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
      </div>
    </div>
  );
}
