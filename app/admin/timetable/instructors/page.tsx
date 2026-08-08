"use client";

import { useState, useEffect, useRef } from "react";
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
  
  // Refs to handle debouncing and prevent race conditions
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchRef = useRef<string>("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Auth is already handled by admin layout (useAdminAuth)
    // Just load instructors data
    loadInstructors();
    
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Function to check if instructor name matches exactly
  const isExactMatch = (instructorName: string): boolean => {
    return instructors.some(
      instructor => instructor.toLowerCase().trim() === instructorName.toLowerCase().trim()
    );
  };

  // Function to load sessions immediately (used when user selects from datalist or presses Enter)
  const loadSessionsImmediately = (instructorName: string) => {
    if (!instructorName.trim()) {
      setSessions([]);
      currentSearchRef.current = "";
      return;
    }

    if (!isExactMatch(instructorName)) {
      return;
    }

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    currentSearchRef.current = instructorName;
    loadInstructorSessions();
  };

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If no instructor selected, clear sessions immediately
    if (!selectedInstructor.trim()) {
      setSessions([]);
      currentSearchRef.current = "";
      return;
    }

    // Check if the selected instructor exactly matches one from the list
    if (!isExactMatch(selectedInstructor)) {
      // Don't clear sessions immediately - wait for debounce to see if user is still typing
      // This prevents flickering while user is typing
      debounceTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && currentSearchRef.current === selectedInstructor) {
          // Only clear if still no match after debounce
          if (!isExactMatch(selectedInstructor)) {
            setSessions([]);
          }
        }
      }, 300);
      return;
    }

    // Debounce the API call - wait 300ms after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        currentSearchRef.current = selectedInstructor;
        loadInstructorSessions();
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedInstructor, instructors]);

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
    const instructorToLoad = currentSearchRef.current || selectedInstructor;
    if (!instructorToLoad || !instructorToLoad.trim()) return;
    
    // Verify the instructor still matches exactly (prevent race conditions)
    const exactMatch = instructors.some(
      instructor => instructor.toLowerCase().trim() === instructorToLoad.toLowerCase().trim()
    );
    
    if (!exactMatch) {
      // Don't load if it doesn't match exactly
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await sessionsAPI.getByInstructor(instructorToLoad);
      
      // Double-check that this is still the current search before updating state
      if (isMountedRef.current && currentSearchRef.current === instructorToLoad) {
        setSessions(response.data || []);
      }
    } catch (err: any) {
      // Only update error if this is still the current search
      if (isMountedRef.current && currentSearchRef.current === instructorToLoad) {
        setError(err.message || "Failed to load instructor sessions");
        setSessions([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
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

  // Color mapping matching student timetable PDF exactly (soft, embedded, with opacity)
  const getPDFColor = (componentType: string) => {
    switch (componentType) {
      case "L":
        return {
          bg: [239, 68, 68, 0.2],
          border: [239, 68, 68, 0.5],
          text: [255, 255, 255],
        };
      case "S":
        return {
          bg: [59, 130, 246, 0.2],
          border: [59, 130, 246, 0.5],
          text: [255, 255, 255],
        };
      case "LB":
        return {
          bg: [168, 85, 247, 0.2],
          border: [168, 85, 247, 0.5],
          text: [255, 255, 255],
        };
      default:
        return {
          bg: [239, 68, 68, 0.2],
          border: [239, 68, 68, 0.5],
          text: [255, 255, 255],
        };
    }
  };

  // Helper to draw soft, embedded cell matching student timetable PDF (text stays inside with maxWidth)
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
    doc.setFillColor(3, 7, 18);
    doc.roundedRect(x, y, width, height, radius, radius, "F");

    const bgR = Math.floor(colors.bg[0] * colors.bg[3] + 3 * (1 - colors.bg[3]));
    const bgG = Math.floor(colors.bg[1] * colors.bg[3] + 7 * (1 - colors.bg[3]));
    const bgB = Math.floor(colors.bg[2] * colors.bg[3] + 18 * (1 - colors.bg[3]));
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(x, y, width, height, radius, radius, "F");

    const borderR = Math.floor(colors.border[0] * colors.border[3] + 3 * (1 - colors.border[3]));
    const borderG = Math.floor(colors.border[1] * colors.border[3] + 7 * (1 - colors.border[3]));
    const borderB = Math.floor(colors.border[2] * colors.border[3] + 18 * (1 - colors.border[3]));
    doc.setDrawColor(borderR, borderG, borderB);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, height, radius, radius, "D");

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    let textY = y + 5;
    text.forEach((line, idx) => {
      if (idx === 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        textY += 1;
      } else if (line.startsWith("Room:")) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
      } else {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
      }
      doc.text(line, x + 2, textY, { maxWidth: width - 4 });
      textY += idx === 0 ? 6 : 4;
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
    const cellHeight = 26; // Increased row height for more vertical spacing
    const headerHeight = 14; // Header height
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

    // Blood red header bar - same as student timetable (139,0,0 gradient)
    const headerBarHeight = 30;
    for (let i = 0; i < headerBarHeight; i++) {
      const ratio = i / 30;
      const r = Math.floor(139 - ratio * 39);
      const g = 0;
      const b = 0;
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
    const nameY = headerBarHeight / 2 - 3;
    doc.text(displayName, pageWidth / 2, nameY, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const countY = headerBarHeight / 2 + 6;
    doc.text(sessionText, pageWidth / 2, countY, { align: "center" });
    
    let yPos = startY;
    
    // Add spacing between teal header and table header
    const headerSpacing = 5; // Extra space to prevent overlap
    yPos += headerSpacing;

    // Table header - blood red (same as student timetable)
    doc.setFillColor(50, 0, 0);
    doc.rect(tableMargin, yPos, tableWidth, headerHeight, "F");
    doc.setFillColor(139, 0, 0);
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
    
    // No spacing between header and first row - cells are adjacent

    // Table rows - ensure everything fits on ONE page
    // Calculate total height needed first
    const cellSessionsForAllDays = DAYS.map(day => 
      SLOTS.map(slot => getCellContentForInstructor(day, slot, instructorSessions))
    );
    const maxSessionsPerRow = cellSessionsForAllDays.map(daySessions => 
      Math.max(...daySessions.map(sessions => sessions.length), 1)
    );
    const totalRowsHeight = maxSessionsPerRow.reduce((sum, maxSessions) => 
      sum + Math.max(rowHeight, maxSessions * 24), 0 // More height per session for readability
    );
    const totalHeightNeeded = headerHeight + headerSpacing + totalRowsHeight;
    // headerBarHeight is already defined above
    const availableHeight = pageHeight - headerBarHeight - startY - margin - footerHeight;
    
    // Increased default sizes for better readability with more spacing
    let sessionHeight = 24; // More height for better spacing
    let currentRowHeight = rowHeight;
    let fontSize = 8; // Good readable size
    let smallFontSize = 6.5; // Secondary text size
    
    if (totalHeightNeeded > availableHeight) {
      // Scale down only if absolutely necessary
      const scaleFactor = Math.min(0.95, availableHeight / totalHeightNeeded);
      sessionHeight = Math.floor(24 * scaleFactor);
      currentRowHeight = Math.floor(rowHeight * scaleFactor);
      fontSize = Math.max(7, Math.floor(8 * scaleFactor));
      smallFontSize = Math.max(5.5, Math.floor(6.5 * scaleFactor));
    }
    
    DAYS.forEach((day) => {
      // Calculate the maximum height needed for this row
      const cellSessionsForDay = SLOTS.map(slot => getCellContentForInstructor(day, slot, instructorSessions));
      const maxSessionsInRow = Math.max(...cellSessionsForDay.map(sessions => sessions.length), 1);
      // Increased minimum card height and spacing between cards
      const minCardHeight = 18; // Minimum height per card
      const cardSpacing = 2; // Spacing between multiple cards in same cell
      const actualRowHeight = Math.max(currentRowHeight, (maxSessionsInRow * minCardHeight) + ((maxSessionsInRow - 1) * cardSpacing));

      // Day cell - blood red accent (same as student timetable)
      doc.setFillColor(15, 23, 42);
      doc.rect(tableMargin, yPos, cellWidth, actualRowHeight, "F");
      doc.setFillColor(139, 0, 0);
      doc.rect(tableMargin, yPos, 1.5, actualRowHeight, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      // Align day names directly under "Day / Slot" header (same padding: tableMargin + 6)
      doc.text(day, tableMargin + 6, yPos + (actualRowHeight / 2));

      // Slot cells - cards with rounded corners matching site exactly
      SLOTS.forEach((slot, slotIdx) => {
        const cellSessions = getCellContentForInstructor(day, slot, instructorSessions);
        const xPos = tableMargin + cellWidth + (slotIdx * cellWidth);

        if (cellSessions.length > 0) {
          // Calculate height per session card
          const cardHeight = actualRowHeight / cellSessions.length;
          
          cellSessions.forEach((session, sessionIdx) => {
            const sessionY = yPos + (sessionIdx * cardHeight);
            const colors = getPDFColor(session.component.component_type);
            
            // Format: course name (bold), then term/class, then Room: (same pattern as student PDF)
            const textLines: string[] = [
              `${session.course.name} (${session.component.component_type})`,
              `Term ${session.term.term_number} • ${session.class.class_code}`,
            ];
            if (session.room) {
              textLines.push(`Room: ${session.room}`);
            }
            drawSoftCell(doc, xPos, sessionY, cellWidth, cardHeight, colors, textLines, 3);
          });
        } else {
          // Empty cell - dark background with subtle border, rounded corners
          doc.setFillColor(25, 25, 35);
          doc.roundedRect(xPos + 1, yPos + 1, cellWidth - 2, actualRowHeight - 2, 2, 2, "F");
          doc.setDrawColor(45, 45, 55);
          doc.setLineWidth(0.3);
          doc.roundedRect(xPos + 1, yPos + 1, cellWidth - 2, actualRowHeight - 2, 2, 2, "D");
          doc.setTextColor(70, 70, 80);
          doc.setFontSize(8);
          doc.text("-", xPos + (cellWidth / 2), yPos + (actualRowHeight / 2), { align: "center" });
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
        // Page number on the right
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 120);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 5,
          { align: "right" }
        );
        // Designer credit at bottom left - blood red theme (#780606)
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        // Add subtle glow effect by drawing text with slight offset in lighter color
        doc.setTextColor(180, 80, 80); // Lighter blood red for glow
        doc.text(
          "DESIGNED BY MAHMOUD HAISAM",
          margin + 0.2,
          pageHeight - 5 + 0.2,
          { align: "left" }
        );
        // Main text with blood red color
        doc.setTextColor(120, 6, 6); // #780606
        doc.text(
          "DESIGNED BY MAHMOUD HAISAM",
          margin,
          pageHeight - 5,
          { align: "left" }
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

      // Footer on all pages - same as student timetable (blood red 139,0,0)
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
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 0, 0);
        doc.text(
          "DESIGNED BY MAHMOUD HAISAM",
          margin,
          pageHeight - 5,
          { align: "left" }
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
              <div className="p-5 bg-gradient-to-br from-red-800/40 to-red-900/40 rounded-2xl shadow-lg shadow-red-900/30 border border-red-700/30">
                <User className="w-10 h-10 text-red-400" />
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
                className="px-5 py-3 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-lg font-semibold shadow-lg shadow-red-900/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 border border-red-600/30"
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
            <div className="p-4 bg-gradient-to-br from-red-800/40 to-red-900/40 rounded-xl shadow-lg shadow-red-900/30 border border-red-700/30">
              <User className="w-7 h-7 text-red-400" />
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
                  onBlur={(e) => {
                    // When user clicks away or selects from datalist, load immediately if exact match
                    const value = e.target.value.trim();
                    if (value && isExactMatch(value)) {
                      loadSessionsImmediately(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // When user presses Enter, load immediately if exact match
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const value = selectedInstructor.trim();
                      if (value && isExactMatch(value)) {
                        loadSessionsImmediately(value);
                      }
                    }
                  }}
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
                <div className="p-4 bg-gradient-to-br from-red-800/40 to-red-900/40 rounded-xl shadow-lg shadow-red-900/30 border border-red-700/30">
                  <Calendar className="w-7 h-7 text-red-400" />
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
                  className="px-4 py-2 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-lg font-semibold shadow-lg shadow-red-900/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 border border-red-600/30"
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
                  className="px-4 py-2 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-lg font-semibold shadow-lg shadow-red-900/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 border border-red-600/30"
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
                                      {session.room && (
                                        <div className="text-cyan-300 text-xs mt-1 flex items-center gap-1">
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
