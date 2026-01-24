"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionsAPI } from "@/lib/api/timetable";
import { Calendar, ArrowLeft, User, BookOpen, MapPin, Clock, Download, DownloadCloud } from "lucide-react";
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
  const [downloadingAllPDF, setDownloadingAllPDF] = useState(false);

  useEffect(() => {
    // Auth is already handled by admin layout (useAdminAuth)
    // Just load instructors data
    loadInstructors();
  }, []);

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
    
    // Deduplicate: Keep only one session per course code + day + slot combination
    // This ensures we don't count duplicate sessions at the same time with the same code
    const seen = new Set<string>();
    const uniqueSessions: InstructorSession[] = [];
    
    cellSessions.forEach(session => {
      // Use course code + day + slot as the unique key
      const key = `${session.course.code}_${day}_${slot}`;
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

  // Helper function to draw simple badge for electives (matching system style)
  const drawElectiveBadge = (
    doc: any,
    x: number,
    y: number,
    text: string
  ) => {
    // Simple purple badge matching the system (purple-500/30 background, purple-500/50 border)
    const purpleBg = [168, 85, 247]; // purple-500
    const purpleBorder = [168, 85, 247]; // purple-500
    
    // Calculate badge dimensions
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    const textWidth = doc.getTextWidth(text);
    const badgeWidth = textWidth + 4;
    const badgeHeight = 5;
    
    // Badge background (purple at 30% opacity - blended with dark background)
    const bgR = Math.floor(purpleBg[0] * 0.3 + 3 * 0.7);
    const bgG = Math.floor(purpleBg[1] * 0.3 + 7 * 0.7);
    const bgB = Math.floor(purpleBg[2] * 0.3 + 18 * 0.7);
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(x, y, badgeWidth, badgeHeight, 2, 2, "F");
    
    // Badge border (purple at 50% opacity)
    const borderR = Math.floor(purpleBorder[0] * 0.5 + 3 * 0.5);
    const borderG = Math.floor(purpleBorder[1] * 0.5 + 7 * 0.5);
    const borderB = Math.floor(purpleBorder[2] * 0.5 + 18 * 0.5);
    doc.setDrawColor(borderR, borderG, borderB);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, badgeWidth, badgeHeight, 2, 2, "D");
    
    // Badge text (purple-300 - light purple)
    doc.setTextColor(196, 181, 253); // purple-300
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(text, x + badgeWidth / 2, y + 3.5, { align: "center" });
    
    return badgeWidth + 2; // Return width for spacing
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
    isElective: boolean = false,
    radius: number = 3,
    mainFontSize: number = 9,
    smallFontSize: number = 7
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
    // Increased padding inside card for better readability
    const cardPadding = 4; // Increased from implicit 2 to explicit 4
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    let textY = y + cardPadding + 2; // Start with more top padding
    let badgeDrawn = false;
    
    text.forEach((line, idx) => {
      // Skip "Elective" text line - we'll draw it as a badge instead
      if (line === "Elective") {
        if (!badgeDrawn && isElective) {
          // Draw simple purple badge matching system style
          const badgeX = x + width - 18;
          const badgeY = y + 3;
          drawElectiveBadge(doc, badgeX, badgeY, "Elective");
          badgeDrawn = true;
        }
        return;
      }
      
      if (idx === 0) {
        // Course name - larger and bold with more spacing
        doc.setFontSize(mainFontSize);
        doc.setFont("helvetica", "bold");
        textY += 1; // Slight adjustment for larger font
      } else {
        // Other lines (component type, term, class) - normal size
        doc.setFontSize(smallFontSize);
        doc.setFont("helvetica", "normal");
      }
      // Increased maxWidth to account for padding, better text wrapping
      const textMaxWidth = width - (cardPadding * 2) - (isElective ? 20 : 4);
      doc.text(line, x + cardPadding, textY, { maxWidth: textMaxWidth });
      // Increased line spacing significantly to prevent overlap between course name and term/class
      if (idx === 0) {
        // After course name, add extra spacing before term/class info
        textY += 9; // Increased from 7 to 9 for more gap
      } else {
        // Between secondary info lines
        textY += 5; // Keep consistent spacing for secondary lines
      }
    });
  };

  // Helper function to get instructor prefix based on session types
  const getInstructorPrefix = (sessions: InstructorSession[]): string => {
    if (!sessions || sessions.length === 0) return "";
    
    // Check all session types
    const hasLecture = sessions.some(s => s.component.component_type === "L");
    const hasSectionOrLab = sessions.some(s => s.component.component_type === "S" || s.component.component_type === "LB");
    
    // Priority: if any session is L, use Dr., otherwise use Eng.
    if (hasLecture) return "Dr.";
    if (hasSectionOrLab) return "Eng.";
    return ""; // Fallback
  };

  // Helper function to draw instructor schedule page (reusable for single or all)
  // Must be defined before handleDownloadPDF and handleDownloadAllInstructorsPDF
  const drawInstructorSchedulePage = (
    doc: any,
    instructorName: string,
    instructorSessions: InstructorSession[],
    startY: number = 35
  ): number => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const footerHeight = 10; // Space for footer
    
    // Increased table width to 95% of page width (centered)
    const tableWidth = pageWidth * 0.95;
    const tableMargin = (pageWidth - tableWidth) / 2; // Center the table
    const cellWidth = tableWidth / 5;
    const cellHeight = 22; // Increased row height for better spacing
    const headerHeight = 14; // Increased header height for better separation
    const rowHeight = cellHeight;

    // Helper to get cell content for an instructor
    const getCellContentForInstructor = (day: string, slot: number, sessions: InstructorSession[]) => {
      const cellSessions = sessions.filter(session => session.day === day && session.slot === slot);
      const seen = new Set<string>();
      const uniqueSessions: InstructorSession[] = [];
      
      cellSessions.forEach(session => {
        const key = `${session.course.code}_${day}_${slot}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSessions.push(session);
        }
      });
      
      return uniqueSessions;
    };

    // Teal header bar (replacing orange)
    const tealHeaderHeight = 30;
    const tealColor = [20, 184, 166]; // Teal-500 RGB
    
    // Draw teal header background
    for (let i = 0; i < tealHeaderHeight; i++) {
      const ratio = i / tealHeaderHeight;
      const r = Math.floor(tealColor[0] - ratio * 5);
      const g = Math.floor(tealColor[1] - ratio * 10);
      const b = Math.floor(tealColor[2] - ratio * 5);
      doc.setFillColor(r, g, b);
      doc.rect(0, i, pageWidth, 1, "F");
    }
    
    // Calculate instructor prefix and display name
    const prefix = getInstructorPrefix(instructorSessions);
    const displayName = instructorName && instructorName.trim() 
      ? `${prefix} ${instructorName}`.trim()
      : "Instructor: N/A";
    
    // Count unique sessions
    const uniqueKeys = new Set<string>();
    instructorSessions.forEach(session => {
      const key = `${session.course.code}_${session.day}_${session.slot}`;
      uniqueKeys.add(key);
    });
    const sessionCount = uniqueKeys.size;
    const sessionText = `${sessionCount} session${sessionCount !== 1 ? 's' : ''} scheduled`;
    
    // Center instructor name and session count in teal header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const nameY = tealHeaderHeight / 2 - 3;
    doc.text(displayName, pageWidth / 2, nameY, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const countY = tealHeaderHeight / 2 + 6;
    doc.text(sessionText, pageWidth / 2, countY, { align: "center" });
    
    let yPos = startY;
    
    // Add spacing between teal header and table header
    const headerSpacing = 5; // Extra space to prevent overlap
    yPos += headerSpacing;

    // Table header with increased spacing
    doc.setFillColor(15, 23, 42);
    doc.rect(tableMargin, yPos, tableWidth, headerHeight, "F");
    
    doc.setFillColor(20, 184, 166); // Teal accent instead of orange
    doc.rect(tableMargin, yPos, 1.5, headerHeight, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Day / Slot", tableMargin + 6, yPos + (headerHeight / 2) + 2); // Centered vertically in header
    
    SLOTS.forEach((slot, idx) => {
      doc.text(`Slot ${slot}`, tableMargin + cellWidth + (idx * cellWidth) + (cellWidth / 2), yPos + (headerHeight / 2) + 2, {
        align: "center",
      });
    });

    yPos += headerHeight;
    
    // Add spacing between header and first row (Saturday)
    const rowSpacing = 3;
    yPos += rowSpacing;

    // Table rows - ensure everything fits on ONE page
    // Calculate total height needed first
    const cellSessionsForAllDays = DAYS.map(day => 
      SLOTS.map(slot => getCellContentForInstructor(day, slot, instructorSessions))
    );
    const maxSessionsPerRow = cellSessionsForAllDays.map(daySessions => 
      Math.max(...daySessions.map(sessions => sessions.length), 1)
    );
    const totalRowsHeight = maxSessionsPerRow.reduce((sum, maxSessions) => 
      sum + Math.max(rowHeight, maxSessions * 20), 0 // Increased session height for better readability
    );
    const totalHeightNeeded = headerHeight + headerSpacing + rowSpacing + totalRowsHeight;
    // tealHeaderHeight is already defined above (line 325)
    const availableHeight = pageHeight - tealHeaderHeight - startY - margin - footerHeight;
    
    // Increased default sizes for better readability
    let sessionHeight = 20; // Increased from 14 to 20
    let currentRowHeight = rowHeight;
    let fontSize = 9; // Increased from 8 to 9
    let smallFontSize = 7; // Increased from 6 to 7
    
    if (totalHeightNeeded > availableHeight) {
      // Scale down only if absolutely necessary
      const scaleFactor = Math.min(0.95, availableHeight / totalHeightNeeded);
      sessionHeight = Math.floor(20 * scaleFactor);
      currentRowHeight = Math.floor(rowHeight * scaleFactor);
      fontSize = Math.max(8, Math.floor(9 * scaleFactor));
      smallFontSize = Math.max(6, Math.floor(7 * scaleFactor));
    }
    
    DAYS.forEach((day) => {
      // Calculate the maximum height needed for this row
      const cellSessionsForDay = SLOTS.map(slot => getCellContentForInstructor(day, slot, instructorSessions));
      const maxSessionsInRow = Math.max(...cellSessionsForDay.map(sessions => sessions.length), 1);
      // Increased minimum card height and spacing between cards
      const minCardHeight = 18; // Minimum height per card
      const cardSpacing = 2; // Spacing between multiple cards in same cell
      const actualRowHeight = Math.max(currentRowHeight, (maxSessionsInRow * minCardHeight) + ((maxSessionsInRow - 1) * cardSpacing));

      // Day cell - aligned with "Day / Slot" header
      doc.setFillColor(15, 23, 42);
      doc.rect(tableMargin, yPos, cellWidth, actualRowHeight, "F");
      
      doc.setFillColor(20, 184, 166); // Teal accent instead of orange
      doc.rect(tableMargin, yPos, 1.5, actualRowHeight, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      // Align day names directly under "Day / Slot" header (same padding: tableMargin + 6)
      doc.text(day, tableMargin + 6, yPos + (actualRowHeight / 2));

      // Slot cells with increased spacing
      SLOTS.forEach((slot, slotIdx) => {
        const cellSessions = getCellContentForInstructor(day, slot, instructorSessions);
        const xPos = tableMargin + cellWidth + (slotIdx * cellWidth);

        if (cellSessions.length > 0) {
          cellSessions.forEach((session, sessionIdx) => {
            // Calculate Y position with spacing between cards
            const sessionY = yPos + (sessionIdx * (minCardHeight + cardSpacing));
            const colors = getPDFColor(session.component.component_type);
            
            const textLines: string[] = [
              `${session.course.name} (${session.component.component_type})`
            ];
            textLines.push(`Term ${session.term.term_number} • ${session.class.class_code}`);
            // Room number removed as requested
            if (session.course.is_elective) {
              textLines.push("Elective");
            }
            
            // Use adjusted font sizes with increased card height for better readability
            drawSoftCell(doc, xPos, sessionY, cellWidth - 2, minCardHeight, colors, textLines, session.course.is_elective || false, 3, fontSize, smallFontSize);
          });
        } else {
          // Empty cell with increased width
          doc.setFillColor(20, 20, 30);
          doc.rect(xPos, yPos, cellWidth - 2, actualRowHeight, "F");
          doc.setDrawColor(40, 40, 50);
          doc.setLineWidth(0.5);
          doc.rect(xPos, yPos, cellWidth - 2, actualRowHeight, "D");
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(8);
          doc.text("-", xPos + ((cellWidth - 2) / 2), yPos + (actualRowHeight / 2), { align: "center" });
        }
      });

      yPos += actualRowHeight;
    });

    return yPos;
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

      // Dark background for entire page
      doc.setFillColor(3, 7, 18);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Draw the schedule using the helper function (teal header with name and count will be drawn inside)
      drawInstructorSchedulePage(doc, selectedInstructor, sessions, 35);

      // Footer on all pages
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

  const handleDownloadAllInstructorsPDF = async () => {
    if (instructors.length === 0) {
      setError("No instructors available to download");
      return;
    }

    try {
      setDownloadingAllPDF(true);
      setError(null);

      // Cache key for instructor sessions data
      const CACHE_KEY = "instructors_sessions_cache";
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      // Check cache first
      let allInstructorSessions: Map<string, InstructorSession[]> = new Map();
      let useCache = false;

      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, hash, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache is still valid (within TTL)
            if (now - timestamp < CACHE_TTL) {
              // Fetch only hash to check if data changed (lightweight check)
              try {
                const hashResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions/instructors/with-sessions`, {
                  method: "HEAD", // Just check headers if possible, or use a hash-only endpoint
                }).catch(() => null);
                
                // For now, always verify with a full fetch but use cache if hash matches
                const response = await sessionsAPI.getAllInstructorsWithSessions();
                const newHash = response.hash;
                
                if (newHash === hash) {
                  // Hash matches, use cached data (no need to process response.data)
                  useCache = true;
                  data.forEach((item: { instructor: string; sessions: InstructorSession[] }) => {
                    allInstructorSessions.set(item.instructor, item.sessions);
                  });
                  console.log("✅ Using cached instructor sessions data (hash verified)");
                } else {
                  // Hash changed, use fresh data and update cache
                  console.log("🔄 Cache invalidated (hash changed), using fresh data");
                  response.data.forEach((item: { instructor: string; sessions: InstructorSession[] }) => {
                    allInstructorSessions.set(item.instructor, item.sessions);
                  });
                  localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: response.data,
                    hash: response.hash,
                    timestamp: Date.now(),
                  }));
                }
              } catch (err) {
                // If fetch fails, use cached data as fallback
                console.warn("Failed to verify cache, using cached data:", err);
                useCache = true;
                data.forEach((item: { instructor: string; sessions: InstructorSession[] }) => {
                  allInstructorSessions.set(item.instructor, item.sessions);
                });
              }
            } else {
              console.log("🔄 Cache expired, fetching fresh data");
            }
          } catch (err) {
            console.warn("Failed to parse cache:", err);
          }
        }
      }

      // Fetch fresh data if not using cache
      if (!useCache) {
        const response = await sessionsAPI.getAllInstructorsWithSessions();
        response.data.forEach((item: { instructor: string; sessions: InstructorSession[] }) => {
          allInstructorSessions.set(item.instructor, item.sessions);
        });
        
        // Save to cache
        if (typeof window !== "undefined") {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: response.data,
            hash: response.hash,
            timestamp: Date.now(),
          }));
        }
        console.log("✅ Fetched and cached fresh instructor sessions data");
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Dark background for entire first page
      doc.setFillColor(3, 7, 18);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Generate schedule for each instructor
      let isFirstPage = true;
      for (let i = 0; i < instructors.length; i++) {
        const instructor = instructors[i];
        const sessions = allInstructorSessions.get(instructor) || [];

        if (sessions.length === 0) {
          // Skip instructors with no sessions
          continue;
        }

        // Add new page for each instructor (except first one)
        if (!isFirstPage) {
          doc.addPage();
          doc.setFillColor(3, 7, 18);
          doc.rect(0, 0, pageWidth, pageHeight, "F");
        }

        // Draw this instructor's schedule (teal header with name and count will be drawn inside)
        drawInstructorSchedulePage(doc, instructor, sessions, 35);
        isFirstPage = false;
      }

      // Footer on all pages
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

      doc.save(`All_Instructors_Schedules.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingAllPDF(false);
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
          <div className="flex items-center justify-between gap-6">
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
            {!loadingInstructors && instructors.length > 0 && (
              <button
                onClick={handleDownloadAllInstructorsPDF}
                disabled={downloadingAllPDF}
                className="px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                title="Download all instructors' schedules in one PDF"
              >
                {downloadingAllPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating All...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-5 h-5" />
                    Download All Instructors ({instructors.length})
                  </>
                )}
              </button>
            )}
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
            <div className="space-y-4">
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
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadAllInstructorsPDF}
                  disabled={downloadingAllPDF || instructors.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  title="Download all instructors' schedules in one PDF"
                >
                  {downloadingAllPDF ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating All...
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-4 h-4" />
                      Download All Instructors
                    </>
                  )}
                </button>
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
                                      {/* Room number removed as requested */}
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
