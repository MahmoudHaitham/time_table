"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionsAPI } from "@/lib/api/timetable";
import { Calendar, ArrowLeft, MapPin, User, BookOpen, Building2, Download } from "lucide-react";
import jsPDF from "jspdf";

interface RoomSession {
  id: number;
  day: string;
  slot: number;
  room: string | null;
  instructor: string | null;
  course: {
    id: number;
    code: string;
    name: string;
  };
  component: {
    id: number;
    component_type: "L" | "S" | "LB";
  };
  class: {
    id: number;
    class_code: string;
    system_type?: string;
  };
  term: {
    id: number;
    term_number: string;
  };
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [1, 2, 3, 4];

// Cache key and TTL
const CACHE_KEY = "room_schedule_cache";
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

export default function RoomSchedulePage() {
  const router = useRouter();
  const [assignedSessions, setAssignedSessions] = useState<RoomSession[]>([]);
  const [unassignedSessions, setUnassignedSessions] = useState<RoomSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<"cached" | "fresh" | null>(null);
  const [downloadingAssignedPDF, setDownloadingAssignedPDF] = useState(false);
  const [downloadingUnassignedPDF, setDownloadingUnassignedPDF] = useState(false);

  useEffect(() => {
    loadRoomSchedule();
  }, []);

  const loadRoomSchedule = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first (unless forcing refresh)
      if (!forceRefresh && typeof window !== "undefined") {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, hash, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            
            // Use cache if less than TTL old
            if (age < CACHE_TTL) {
              console.log(`[RoomSchedule] Loading from cache (age: ${Math.round(age / 1000)}s)`);
              setAssignedSessions(data.assigned || []);
              setUnassignedSessions(data.unassigned || []);
              setCacheStatus("cached");
              setLoading(false);
              return;
            } else {
              console.log(`[RoomSchedule] Cache expired, fetching fresh data`);
            }
          } catch (e) {
            console.warn("[RoomSchedule] Cache parse error, fetching fresh data");
          }
        }
      }

      // Fetch fresh data from server
      console.log(`[RoomSchedule] Fetching fresh data...`);
      const startTime = Date.now();
      const response = await sessionsAPI.getRoomSchedule();
      const fetchTime = Date.now() - startTime;
      
      const data = response.data || { assigned: [], unassigned: [] };
      const hash = response.hash || null;
      
      setAssignedSessions(data.assigned || []);
      setUnassignedSessions(data.unassigned || []);

      // Cache the result
      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: data,
          hash: hash,
          timestamp: Date.now(),
        }));
        console.log(`[RoomSchedule] Data cached (fetch took ${fetchTime}ms)`);
        setCacheStatus("fresh");
      }
    } catch (err: any) {
      console.error("Failed to load room schedule:", err);
      setError(err.message || "Failed to load room schedule");
      setAssignedSessions([]);
      setUnassignedSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Group sessions by course, component type, room, and instructor
  // Combine class codes into a single display
  // But first split comma-separated instructors/rooms into separate entries
  interface GroupedSession {
    course: RoomSession['course'];
    component: RoomSession['component'];
    room: string | null;
    instructor: string | null;
    classes: string[]; // Array of class codes
    term: RoomSession['term'];
    system_type?: string; // 140, 160, 180
  }

  // Helper to split a session with comma-separated instructors/rooms into individual entries
  interface ExpandedSession {
    course: RoomSession['course'];
    component: RoomSession['component'];
    room: string | null;
    instructor: string | null;
    class_code: string;
    term: RoomSession['term'];
    system_type?: string;
  }

  const expandSession = (session: RoomSession): ExpandedSession[] => {
    const instructors = session.instructor 
      ? session.instructor.split(',').map(i => i.trim()).filter(i => i)
      : [null];
    const rooms = session.room 
      ? session.room.split(',').map(r => r.trim()).filter(r => r)
      : [null];
    
    const expanded: ExpandedSession[] = [];
    
    // If we have multiple instructors, pair each with their corresponding room
    if (instructors.length > 1 || rooms.length > 1) {
      const maxLength = Math.max(instructors.length, rooms.length);
      for (let i = 0; i < maxLength; i++) {
        const instructor = i < instructors.length ? instructors[i] : instructors[0];
        const room = i < rooms.length ? rooms[i] : rooms[0];
        expanded.push({
          course: session.course,
          component: session.component,
          room: room,
          instructor: instructor,
          class_code: session.class.class_code,
          term: session.term,
          system_type: session.class.system_type,
        });
      }
    } else {
      // Single instructor/room, keep as-is
      expanded.push({
        course: session.course,
        component: session.component,
        room: rooms[0],
        instructor: instructors[0],
        class_code: session.class.class_code,
        term: session.term,
        system_type: session.class.system_type,
      });
    }
    
    return expanded;
  };

  const getCellContent = (sessions: RoomSession[], day: string, slot: number): GroupedSession[] => {
    const filtered = sessions.filter(session => session.day === day && session.slot === slot);
    
    // First, expand sessions with comma-separated instructors/rooms
    const expandedSessions: ExpandedSession[] = [];
    filtered.forEach(session => {
      expandedSessions.push(...expandSession(session));
    });
    
    // Group by course code + component type + room + instructor
    const groupMap = new Map<string, GroupedSession>();
    
    expandedSessions.forEach(session => {
      // Create a unique key for grouping
      const key = `${session.course.code}_${session.component.component_type}_${session.room || 'null'}_${session.instructor || 'null'}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          course: session.course,
          component: session.component,
          room: session.room,
          instructor: session.instructor,
          classes: [session.class_code],
          term: session.term,
          system_type: session.system_type,
        });
      } else {
        const existing = groupMap.get(key)!;
        // Add class code if not already present
        if (!existing.classes.includes(session.class_code)) {
          existing.classes.push(session.class_code);
        }
      }
    });
    
    // Sort classes within each group
    groupMap.forEach(group => {
      group.classes.sort();
    });
    
    return Array.from(groupMap.values());
  };

  // PDF Color mapping - matching site UI exactly
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
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    colors: { bg: number[]; border: number[]; text: number[] },
    textLines: string[],
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
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, height, radius, radius, "D");

    // Text rendering
    const cardPadding = 3;
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    let textY = y + cardPadding + 3;
    
    textLines.forEach((line, idx) => {
      if (idx === 0) {
        // Course code - bold
        doc.setFontSize(mainFontSize);
        doc.setFont("helvetica", "bold");
      } else if (idx === 1) {
        // Course name - normal, slightly smaller
        doc.setFontSize(smallFontSize);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(220, 220, 220); // Slightly dimmer
      } else {
        // Other info
        doc.setFontSize(smallFontSize - 1);
        doc.setFont("helvetica", "normal");
        if (line.startsWith("Room:")) {
          doc.setTextColor(103, 232, 249); // cyan-300
        } else if (line.startsWith("👤") || line.includes("Instructor")) {
          doc.setTextColor(180, 180, 180); // gray-300
        } else {
          doc.setTextColor(200, 200, 200); // gray-200
        }
      }
      
      const maxWidth = width - (cardPadding * 2) - 2;
      doc.text(line, x + cardPadding, textY, { maxWidth: maxWidth });
      
      if (idx === 0) {
        textY += 5; // After course code
      } else if (idx === 1) {
        textY += 4; // After course name
      } else {
        textY += 3.5; // Other lines
      }
    });
  };

  // Helper function to get all grouped sessions for PDF
  const getAllGroupedSessions = (sessions: RoomSession[]): Map<string, Map<number, GroupedSession[]>> => {
    const result = new Map<string, Map<number, GroupedSession[]>>();
    
    DAYS.forEach(day => {
      const dayMap = new Map<number, GroupedSession[]>();
      SLOTS.forEach(slot => {
        const grouped = getCellContent(sessions, day, slot);
        dayMap.set(slot, grouped);
      });
      result.set(day, dayMap);
    });
    
    return result;
  };

  // PDF Generation - Multiple pages per day if needed, ALL sessions displayed
  const generatePDF = async (
    sessions: RoomSession[], 
    title: string, 
    filename: string,
    showRoom: boolean,
    headerColor: number[], // [R, G, B]
    footerTextColor: number[] // [R, G, B] for "DESIGNED BY MAHMOUD HAISAM"
  ) => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 8;
    const footerHeight = 8;
    const headerHeight = 16;
    const slotHeaderHeight = 8;
    
    // Fixed card height for consistent display
    const cardHeight = 12;
    const cardSpacing = 1;

    // Calculate how many cards can fit per page
    const contentStartY = headerHeight + 4 + slotHeaderHeight + 1;
    const availableHeight = pageHeight - contentStartY - footerHeight - margin;
    const cardsPerPage = Math.floor(availableHeight / (cardHeight + cardSpacing));

    // Get all grouped sessions
    const allGrouped = getAllGroupedSessions(sessions);

    // Helper to truncate text
    const truncateText = (text: string, fontSize: number, maxW: number): string => {
      doc.setFontSize(fontSize);
      let truncated = text;
      while (doc.getTextWidth(truncated) > maxW && truncated.length > 3) {
        truncated = truncated.slice(0, -4) + "...";
      }
      return truncated;
    };

    // Helper to draw page header
    const drawPageHeader = (day: string, pageNum: number, totalPagesForDay: number) => {
      // Dark background
      doc.setFillColor(3, 7, 18);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Header bar with gradient
      for (let i = 0; i < headerHeight; i++) {
        const ratio = i / headerHeight;
        const r = Math.floor(headerColor[0] - ratio * 10);
        const g = Math.floor(headerColor[1] - ratio * 10);
        const b = Math.floor(headerColor[2] - ratio * 10);
        doc.setFillColor(r, g, b);
        doc.rect(0, i, pageWidth, 1, "F");
      }

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const pageIndicator = totalPagesForDay > 1 ? ` (${pageNum}/${totalPagesForDay})` : "";
      doc.text(`${title} - ${day}${pageIndicator}`, pageWidth / 2, headerHeight / 2 + 2, { align: "center" });

      // Slot headers
      const tableStartY = headerHeight + 4;
      const tableWidth = pageWidth - (margin * 2);
      const cellWidth = tableWidth / 4;

      doc.setFillColor(15, 23, 42);
      doc.rect(margin, tableStartY, tableWidth, slotHeaderHeight, "F");
      
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(margin, tableStartY, tableWidth, 1, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      SLOTS.forEach((slot, idx) => {
        const x = margin + (idx * cellWidth) + (cellWidth / 2);
        doc.text(`Slot ${slot}`, x, tableStartY + (slotHeaderHeight / 2) + 1.5, { align: "center" });
      });
    };

    // Helper to detect room conflicts for a given day - uses SHARED function
    // Returns a Map of slot -> Set of conflicting room numbers
    const detectRoomConflictsForDay = (daySlots: Map<number, GroupedSession[]>): Map<number, Set<string>> => {
      const conflictsBySlot = new Map<number, Set<string>>();
      
      SLOTS.forEach(slot => {
        const sessions = daySlots.get(slot) || [];
        // Use the SAME shared function as the UI
        const conflicts = detectConflictsFromGroupedSessions(sessions);
        conflictsBySlot.set(slot, conflicts);
      });
      
      return conflictsBySlot;
    };

    // Helper to draw a single card
    const drawCard = (
      item: GroupedSession,
      xPos: number,
      yPos: number,
      cellWidth: number,
      isRoomConflict: boolean = false
    ) => {
      const colors = getPDFColor(item.component.component_type);
      const padding = 1.5;
      const maxTextWidth = cellWidth - (padding * 2) - 2;

      // Draw card background
      const bgR = Math.floor(colors.bg[0] * colors.bg[3] + 3 * (1 - colors.bg[3]));
      const bgG = Math.floor(colors.bg[1] * colors.bg[3] + 7 * (1 - colors.bg[3]));
      const bgB = Math.floor(colors.bg[2] * colors.bg[3] + 18 * (1 - colors.bg[3]));
      doc.setFillColor(bgR, bgG, bgB);
      doc.roundedRect(xPos + 0.5, yPos, cellWidth - 1, cardHeight, 1.5, 1.5, "F");

      // Draw border - RED if conflict, normal otherwise
      if (isRoomConflict) {
        doc.setDrawColor(239, 68, 68); // red-500
        doc.setLineWidth(0.8); // Thicker border for conflict
      } else {
        const borderR = Math.floor(colors.border[0] * colors.border[3] + 3 * (1 - colors.border[3]));
        const borderG = Math.floor(colors.border[1] * colors.border[3] + 7 * (1 - colors.border[3]));
        const borderB = Math.floor(colors.border[2] * colors.border[3] + 18 * (1 - colors.border[3]));
        doc.setDrawColor(borderR, borderG, borderB);
        doc.setLineWidth(0.3);
      }
      doc.roundedRect(xPos + 0.5, yPos, cellWidth - 1, cardHeight, 1.5, 1.5, "D");

      // Line 1: Course name + type + system type (bold white)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      const systemType = item.system_type || "";
      const courseLine = truncateText(`${item.course.name} (${item.component.component_type}) - ${systemType}`, 5.5, maxTextWidth);
      doc.text(courseLine, xPos + padding, yPos + 3.5);

      // Line 2: Room + Class (for assigned) OR Instructor + Class (for unassigned)
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      
      if (showRoom && item.room) {
        // Assigned: Room (cyan or RED if conflict) + Class (gray)
        const roomPart = isRoomConflict ? `[!] Room: ${item.room}` : `Room: ${item.room}`;
        const classPart = ` | ${item.classes.join(", ")}`;
        
        if (isRoomConflict) {
          doc.setTextColor(248, 113, 113); // red-400 for conflict
          doc.setFont("helvetica", "bold");
        } else {
          doc.setTextColor(103, 232, 249); // cyan-300
          doc.setFont("helvetica", "normal");
        }
        doc.setFontSize(5);
        const roomText = truncateText(roomPart, 5, maxTextWidth * 0.55);
        doc.text(roomText, xPos + padding, yPos + 7);
        
        const roomWidth = doc.getTextWidth(roomText);
        doc.setTextColor(200, 200, 200); // gray
        doc.setFont("helvetica", "normal");
        const classText = truncateText(classPart, 5, maxTextWidth - roomWidth - 1);
        doc.text(classText, xPos + padding + roomWidth, yPos + 7);
      } else {
        // Unassigned: Instructor (yellow) + Class (gray)
        if (item.instructor) {
          const instrPart = `${item.instructor}`;
          const classPart = ` | ${item.classes.join(", ")}`;
          
          doc.setTextColor(250, 204, 21); // yellow-400
          const instrText = truncateText(instrPart, 5, maxTextWidth * 0.55);
          doc.text(instrText, xPos + padding, yPos + 7);
          
          const instrWidth = doc.getTextWidth(instrText);
          doc.setTextColor(200, 200, 200); // gray
          const classText = truncateText(classPart, 5, maxTextWidth - instrWidth - 1);
          doc.text(classText, xPos + padding + instrWidth, yPos + 7);
        } else {
          doc.setTextColor(200, 200, 200);
          const classLine = truncateText(`Class: ${item.classes.join(", ")}`, 5, maxTextWidth);
          doc.text(classLine, xPos + padding, yPos + 7);
        }
      }
    };

    let isFirstPage = true;
    
    DAYS.forEach((day) => {
      const daySlots = allGrouped.get(day);
      if (!daySlots) return;

      // Check if this day has any sessions
      let hasAnySessions = false;
      daySlots.forEach((grouped) => {
        if (grouped.length > 0) hasAnySessions = true;
      });
      if (!hasAnySessions) return;

      // Detect room conflicts for this day PER SLOT (only for assigned rooms)
      // Uses the SAME shared function as the website UI
      const conflictsBySlot = showRoom ? detectRoomConflictsForDay(daySlots) : new Map<number, Set<string>>();

      // Find max sessions in any slot for this day
      let maxSessionsInDay = 1;
      SLOTS.forEach(slot => {
        const grouped = daySlots.get(slot) || [];
        if (grouped.length > maxSessionsInDay) maxSessionsInDay = grouped.length;
      });

      // Calculate how many pages needed for this day
      const pagesNeeded = Math.ceil(maxSessionsInDay / cardsPerPage);
      const tableWidth = pageWidth - (margin * 2);
      const cellWidth = tableWidth / 4;

      // Generate pages for this day
      for (let pageIdx = 0; pageIdx < pagesNeeded; pageIdx++) {
        // Add new page (except for very first page)
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        // Draw header
        drawPageHeader(day, pageIdx + 1, pagesNeeded);

        // Calculate which session range to show on this page
        const startIdx = pageIdx * cardsPerPage;
        const endIdx = Math.min(startIdx + cardsPerPage, maxSessionsInDay);

        // Draw sessions for each slot
        SLOTS.forEach((slot, slotIdx) => {
          const grouped = daySlots.get(slot) || [];
          const xPos = margin + (slotIdx * cellWidth);
          
          // Get conflicts for THIS SLOT (same as website)
          const slotConflicts = conflictsBySlot.get(slot) || new Set<string>();

          // Get sessions for this page
          const pageGrouped = grouped.slice(startIdx, endIdx);

          if (pageGrouped.length > 0) {
            pageGrouped.forEach((item, itemIdx) => {
              const yPos = contentStartY + (itemIdx * (cardHeight + cardSpacing));
              // Check if this room has a conflict IN THIS SLOT
              const isConflict = item.room ? slotConflicts.has(item.room.toLowerCase().trim()) : false;
              drawCard(item, xPos, yPos, cellWidth, isConflict);
            });
          } else if (pageIdx === 0) {
            // Only show empty indicator on first page
            doc.setFillColor(20, 20, 30);
            doc.roundedRect(xPos + 0.5, contentStartY, cellWidth - 1, cardHeight, 1.5, 1.5, "F");
            doc.setDrawColor(40, 40, 50);
            doc.setLineWidth(0.3);
            doc.roundedRect(xPos + 0.5, contentStartY, cellWidth - 1, cardHeight, 1.5, 1.5, "D");
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.text("-", xPos + (cellWidth / 2), contentStartY + 6, { align: "center" });
          }
        });
      }
    });

    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 120);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 3, { align: "right" });
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(footerTextColor[0], footerTextColor[1], footerTextColor[2]);
      doc.text("DESIGNED BY MAHMOUD HAISAM", margin, pageHeight - 3, { align: "left" });
    }

    doc.save(filename);
  };

  // Handle download for assigned rooms
  const handleDownloadAssignedPDF = async () => {
    if (assignedSessions.length === 0) return;
    
    try {
      setDownloadingAssignedPDF(true);
      await generatePDF(
        assignedSessions,
        "Room Schedule (Assigned Rooms)",
        "Room_Schedule_Assigned.pdf",
        true,
        [20, 184, 166], // teal-500
        [34, 211, 238] // cyan-400 for footer text
      );
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingAssignedPDF(false);
    }
  };

  // Handle download for unassigned rooms
  const handleDownloadUnassignedPDF = async () => {
    if (unassignedSessions.length === 0) return;
    
    try {
      setDownloadingUnassignedPDF(true);
      await generatePDF(
        unassignedSessions,
        "Unassigned Rooms (Room = NULL)",
        "Room_Schedule_Unassigned.pdf",
        false,
        [239, 68, 68], // red-500
        [248, 113, 113] // red-400 for footer text
      );
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingUnassignedPDF(false);
    }
  };

  // SHARED conflict detection function - used by BOTH website UI AND PDF
  // Conflict = Same room + Different course + (different instructor OR missing instructor)
  // NOT conflict only if BOTH have the SAME non-empty instructor name
  const detectConflictsFromGroupedSessions = (groupedSessions: GroupedSession[]): Set<string> => {
    const conflictingRooms = new Set<string>();
    
    // Group by room - store course code AND instructor pairs
    const roomMap = new Map<string, Array<{course: string; instructor: string | null}>>(); 
    groupedSessions.forEach(item => {
      if (item.room) {
        const room = item.room.toLowerCase().trim();
        if (!roomMap.has(room)) {
          roomMap.set(room, []);
        }
        // Add course + instructor pair if not already present
        const existing = roomMap.get(room)!;
        const alreadyExists = existing.some(e => e.course === item.course.code && e.instructor === item.instructor);
        if (!alreadyExists) {
          existing.push({ course: item.course.code, instructor: item.instructor });
        }
      }
    });
    
    // Find conflicts
    roomMap.forEach((entries, room) => {
      if (entries.length > 1) {
        // Check if there are different courses
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            const a = entries[i];
            const b = entries[j];
            // Different course?
            if (a.course !== b.course) {
              // Check if both have the SAME non-empty instructor
              const aInstructor = a.instructor?.trim() || "";
              const bInstructor = b.instructor?.trim() || "";
              
              // NOT a conflict only if both instructors are non-empty AND equal
              const sameValidInstructor = aInstructor !== "" && bInstructor !== "" && aInstructor === bInstructor;
              
              if (!sameValidInstructor) {
                // It's a conflict - either one/both are empty or they're different
                conflictingRooms.add(room);
                break;
              }
            }
          }
          if (conflictingRooms.has(room)) break;
        }
      }
    });
    
    return conflictingRooms;
  };

  // Helper for UI - wraps the shared function
  const detectUIRoomConflicts = (sessions: RoomSession[], day: string, slot: number): Set<string> => {
    const cellContent = getCellContent(sessions, day, slot);
    return detectConflictsFromGroupedSessions(cellContent);
  };

  const WeeklyTable = ({ 
    sessions, 
    showRoom = true,
    emptyMessage = "No sessions found"
  }: { 
    sessions: RoomSession[]; 
    showRoom?: boolean;
    emptyMessage?: string;
  }) => {
    const hasAnySessions = sessions.length > 0;

    if (!hasAnySessions) {
      return (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-16 h-16 mx-auto mb-6 opacity-50" />
          <p className="text-xl font-semibold mb-2">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile: Stacked Day View */}
        <div className="block md:hidden space-y-4">
          {DAYS.map((day, dayIndex) => {
            const daySessions: Array<{slot: number; items: GroupedSession[]; conflicts: Set<string>}> = [];
            SLOTS.forEach((slot) => {
              const cellContent = getCellContent(sessions, day, slot);
              const conflicts = showRoom ? detectUIRoomConflicts(sessions, day, slot) : new Set<string>();
              if (cellContent.length > 0) {
                daySessions.push({ slot, items: cellContent, conflicts });
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
                  {daySessions.map(({ slot, items, conflicts }) => (
                    <div key={slot} className="space-y-1.5">
                      <div className="text-xs text-gray-400 font-medium">Slot {slot}</div>
                      {items.map((item, idx) => {
                        const isConflict = item.room ? conflicts.has(item.room.toLowerCase().trim()) : false;
                        return (
                          <motion.div
                            key={`${item.course.code}-${item.component.component_type}-${idx}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`text-xs p-2 sm:p-2.5 ${getSlotColor(item.component.component_type)} rounded-lg backdrop-blur-sm ${isConflict ? 'border-2 border-red-500 ring-2 ring-red-500/50' : 'border'}`}
                          >
                            <div className="font-semibold text-white text-xs sm:text-sm">
                              {item.course.code} ({item.component.component_type})
                            </div>
                            <div className="text-gray-200 text-xs mt-1 truncate">
                              {item.course.name}
                            </div>
                            <div className="text-gray-300 text-xs mt-1">
                              {item.classes.join(", ")}
                            </div>
                            {showRoom && item.room && (
                              <div className={`text-xs flex items-center gap-1 mt-1 ${isConflict ? 'text-red-400 font-bold' : 'text-cyan-300'}`}>
                                {isConflict && <span className="text-red-500">⚠</span>}
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{item.room}</span>
                                {isConflict && <span className="text-red-400 text-[10px] ml-1">(CONFLICT)</span>}
                              </div>
                            )}
                            {item.instructor && (
                              <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{item.instructor}</span>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
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
                    const cellContent = getCellContent(sessions, day, slot);
                    const conflicts = showRoom ? detectUIRoomConflicts(sessions, day, slot) : new Set<string>();
                    return (
                      <td
                        key={slot}
                        className="p-2 min-w-[150px] h-auto border border-white/10 align-top"
                      >
                        {cellContent.length > 0 ? (
                          <div className="space-y-1">
                            {cellContent.map((item, idx) => {
                              const isConflict = item.room ? conflicts.has(item.room.toLowerCase().trim()) : false;
                              return (
                                <motion.div
                                  key={`${item.course.code}-${item.component.component_type}-${idx}`}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`text-xs p-1.5 sm:p-2 ${getSlotColor(item.component.component_type)} rounded-lg backdrop-blur-sm ${isConflict ? 'border-2 border-red-500 ring-2 ring-red-500/50' : 'border'}`}
                                >
                                  <div className="font-semibold text-white text-xs">
                                    {item.course.code} ({item.component.component_type})
                                  </div>
                                  <div className="text-gray-200 text-xs mt-1 truncate">
                                    {item.course.name}
                                  </div>
                                  <div className="text-gray-300 text-xs mt-1">
                                    {item.classes.join(", ")}
                                  </div>
                                  {showRoom && item.room && (
                                    <div className={`text-xs flex items-center gap-1 mt-1 ${isConflict ? 'text-red-400 font-bold' : 'text-cyan-300'}`}>
                                      {isConflict && <span className="text-red-500">⚠</span>}
                                      <MapPin className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{item.room}</span>
                                      {isConflict && <span className="text-red-400 text-[10px] ml-1">(CONFLICT)</span>}
                                    </div>
                                  )}
                                  {item.instructor && (
                                    <div className="text-gray-300 text-xs flex items-center gap-1 mt-1">
                                      <User className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{item.instructor}</span>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
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
    );
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
              onClick={() => router.push("/admin/timetable")}
              className="p-3 glass border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="p-5 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-2xl shadow-lg shadow-cyan-500/20">
              <Building2 className="w-10 h-10 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                <span className="text-gradient">Room Schedule</span>
              </h1>
              <p className="text-gray-400 text-lg">View all sessions by room assignment status</p>
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

        {/* Section 1: Assigned Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass border border-white/10 rounded-2xl p-6 shadow-xl mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-teal-500/30 to-cyan-600/30 rounded-xl shadow-lg shadow-teal-500/20">
                <MapPin className="w-7 h-7 text-teal-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Room Schedule (Assigned Rooms)
                </h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  Sessions with room assignments ({assignedSessions.length} sessions)
                  {cacheStatus === "cached" && (
                    <span className="ml-2 text-xs text-green-400">(Loaded from cache)</span>
                  )}
                  {cacheStatus === "fresh" && (
                    <span className="ml-2 text-xs text-blue-400">(Fresh data)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadAssignedPDF}
                disabled={downloadingAssignedPDF || loading || assignedSessions.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold shadow-lg shadow-teal-500/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                title="Download assigned rooms schedule as PDF"
              >
                {downloadingAssignedPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </>
                )}
              </button>
              <button
                onClick={() => loadRoomSchedule(true)}
                disabled={loading}
                className="px-3 sm:px-4 py-2 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all text-white text-sm sm:text-base disabled:opacity-50 min-h-[44px]"
                title="Refresh data"
              >
                <span className="text-cyan-400">Refresh</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm sm:text-base">Loading room schedule...</p>
            </div>
          ) : (
            <WeeklyTable 
              sessions={assignedSessions} 
              showRoom={true} 
              emptyMessage="No sessions with assigned rooms"
            />
          )}
        </motion.div>

        {/* Section 2: Unassigned Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass border border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-500/30 to-rose-600/30 rounded-xl shadow-lg shadow-red-500/20">
                <Calendar className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Unassigned Rooms (Room = NULL)
                </h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  Sessions without room assignments ({unassignedSessions.length} sessions)
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadUnassignedPDF}
              disabled={downloadingUnassignedPDF || loading || unassignedSessions.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-semibold shadow-lg shadow-red-500/50 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              title="Download unassigned rooms schedule as PDF"
            >
              {downloadingUnassignedPDF ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm sm:text-base">Loading...</p>
            </div>
          ) : (
            <WeeklyTable 
              sessions={unassignedSessions} 
              showRoom={false} 
              emptyMessage="All sessions have assigned rooms"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
