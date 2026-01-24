"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { coursesAPI } from "@/lib/api/timetable";
import { ArrowLeft, BookOpen, Users, Calendar, MapPin, Clock, CheckCircle2, XCircle, Edit, Trash2, Download } from "lucide-react";
import AlertModal from "@/components/ui/AlertModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

// Cache key and TTL
const CACHE_KEY = "courses_with_assignments";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface Course {
  id: number;
  code: string;
  name: string;
  is_elective: boolean;
  component_types?: string;
}

interface Class {
  id: number;
  class_code: string;
  term_id: number;
}

interface ClassCourse {
  id: number;
  class_id: number;
  course_id: number;
  course: Course;
}

interface Component {
  id: number;
  class_course_id: number;
  component_type: "L" | "S" | "LB";
  sessions: Session[];
}

interface Session {
  id: number;
  component_id: number;
  day: string;
  slot: number;
  room: string | null;
  instructor: string | null;
}

interface CourseAssignment {
  course: Course;
  classes: Array<{
    class: Class;
    components: Component[];
    totalSessions: number;
  }>;
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<"cached" | "fresh" | null>(null);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editIsElective, setEditIsElective] = useState(false);
  const [editHasLab, setEditHasLab] = useState(false);
  
  // Alert and confirm modals
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: "success" as "success" | "error" | "warning" | "info",
    title: "",
    message: "",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "danger" as "danger" | "warning" | "info",
  });

  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
    if (!token) {
      router.push("/login");
      return;
    }
    loadCoursesData();
  }, [router]);

  const loadCoursesData = async (forceRefresh: boolean = false) => {
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
              console.log(`[Courses] Loading from cache (age: ${Math.round(age / 1000)}s)`);
              setCourses(data.map((a: CourseAssignment) => a.course));
              setCourseAssignments(data);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn("[Courses] Cache parse error, fetching fresh data");
          }
        }
      }

      // Fetch fresh data from optimized endpoint
      console.log("[Courses] Fetching fresh data from server...");
      const startTime = Date.now();
      const response = await coursesAPI.getAllWithAssignments();
      const fetchTime = Date.now() - startTime;
      
      const { data, hash } = response;
      
      // Extract courses list
      const allCourses = data.map((assignment: CourseAssignment) => assignment.course);
      setCourses(allCourses);
      setCourseAssignments(data);

      // Cache the result
      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          hash,
          timestamp: Date.now(),
        }));
        console.log(`[Courses] Data cached (fetch took ${fetchTime}ms, hash: ${hash})`);
        setCacheStatus("fresh");
      }
    } catch (err: any) {
      console.error("Failed to load courses data:", err);
      setError(err.message || "Failed to load courses data");
    } finally {
      setLoading(false);
    }
  };

  // Invalidate cache when courses are modified
  const invalidateCache = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CACHE_KEY);
    }
  };

  const handleEditClick = (course: Course) => {
    setEditingCourse(course);
    setEditIsElective(course.is_elective);
    
    // Check if course has Lab component
    const hasLab = course.component_types?.includes("LB") || false;
    setEditHasLab(hasLab);
    
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingCourse) return;
    
    try {
      // Build components array: L and S are always included, LB if checked
      const components = ["L", "S", ...(editHasLab ? ["LB"] : [])];
      
      await coursesAPI.update(editingCourse.id, {
        is_elective: editIsElective,
        components: components,
      });
      
      // Invalidate cache and reload
      invalidateCache();
      
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Course Updated Successfully!",
        message: `Course "${editingCourse.code}" has been updated successfully!`,
      });
      
      setShowEditModal(false);
      setEditingCourse(null);
      loadCoursesData(true); // Force refresh
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Failed to Update Course",
        message: err.message || "Failed to update course. Please try again.",
      });
    }
  };

  const handleDeleteClick = (course: Course) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Course",
      message: `Are you sure you want to delete course "${course.code}"? This action cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
        try {
          await coursesAPI.delete(course.id);
          
          // Invalidate cache and reload
          invalidateCache();
          
          setAlertModal({
            isOpen: true,
            type: "success",
            title: "Course Deleted Successfully!",
            message: `Course "${course.code}" has been deleted successfully!`,
          });
          
          loadCoursesData(true); // Force refresh
        } catch (err: any) {
          setAlertModal({
            isOpen: true,
            type: "error",
            title: "Failed to Delete Course",
            message: err.message || "Failed to delete course. Please try again.",
          });
        }
      },
    });
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use cached data if available, otherwise fetch fresh data
      let dataToExport: CourseAssignment[];
      
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            
            // Use cache if less than TTL old
            if (age < CACHE_TTL) {
              console.log("[Download] Using cached data");
              dataToExport = data;
            } else {
              // Cache expired, fetch fresh data
              console.log("[Download] Cache expired, fetching fresh data");
              const response = await coursesAPI.getAllWithAssignments();
              dataToExport = response.data;
            }
          } catch (e) {
            // Cache parse error, fetch fresh data
            console.log("[Download] Cache parse error, fetching fresh data");
            const response = await coursesAPI.getAllWithAssignments();
            dataToExport = response.data;
          }
        } else {
          // No cache, fetch fresh data
          console.log("[Download] No cache, fetching fresh data");
          const response = await coursesAPI.getAllWithAssignments();
          dataToExport = response.data;
        }
      } else {
        // Server-side, fetch fresh data
        const response = await coursesAPI.getAllWithAssignments();
        dataToExport = response.data;
      }

      // Format data as CSV
      const csvRows: string[] = [];
      
      // CSV Header
      csvRows.push("Course Code,Course Name,Is Elective,Components,Class Code,Component Type,Day,Slot,Room,Instructor");
      
      // Process each course assignment
      dataToExport.forEach((assignment) => {
        const course = assignment.course;
        const courseCode = course.code;
        const courseName = `"${course.name.replace(/"/g, '""')}"`; // Escape quotes in CSV
        const isElective = course.is_elective ? "Yes" : "No";
        const components = course.component_types || "N/A";
        
        if (assignment.classes.length === 0) {
          // Course not assigned to any class
          csvRows.push(`${courseCode},${courseName},${isElective},${components},N/A,N/A,N/A,N/A,N/A,N/A`);
        } else {
          // Course assigned to classes
          assignment.classes.forEach((classAssignment) => {
            const classCode = classAssignment.class.class_code;
            
            if (classAssignment.components.length === 0) {
              // Class has no components
              csvRows.push(`${courseCode},${courseName},${isElective},${components},${classCode},N/A,N/A,N/A,N/A,N/A`);
            } else {
              // Process each component
              classAssignment.components.forEach((component) => {
                const componentType = component.component_type === "L" ? "Lecture" : 
                                     component.component_type === "S" ? "Section" : "Lab";
                
                if (component.sessions.length === 0) {
                  // Component has no sessions
                  csvRows.push(`${courseCode},${courseName},${isElective},${components},${classCode},${componentType},N/A,N/A,N/A,N/A`);
                } else {
                  // Process each session
                  component.sessions.forEach((session) => {
                    const day = session.day || "N/A";
                    const slot = session.slot?.toString() || "N/A";
                    const room = session.room ? `"${session.room.replace(/"/g, '""')}"` : "N/A";
                    const instructor = session.instructor ? `"${session.instructor.replace(/"/g, '""')}"` : "N/A";
                    
                    csvRows.push(`${courseCode},${courseName},${isElective},${components},${classCode},${componentType},${day},${slot},${room},${instructor}`);
                  });
                }
              });
            }
          });
        }
      });

      // Create CSV content
      const csvContent = csvRows.join("\n");
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `courses_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Download Successful!",
        message: `Courses data has been downloaded successfully. Total courses: ${dataToExport.length}`,
      });
    } catch (err: any) {
      console.error("Failed to download courses:", err);
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Download Failed",
        message: err.message || "Failed to download courses data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
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
          <p className="text-white text-base sm:text-lg md:text-xl break-words">Loading courses...</p>
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
          className="mb-6 sm:mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-3 sm:mb-4 transition-colors group text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0" />
            <span className="break-words">Back</span>
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              <div className="p-2 sm:p-3 md:p-4 bg-cyan-500/20 rounded-lg sm:rounded-xl flex-shrink-0">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 break-words leading-tight">
                  All <span className="text-gradient">Courses</span>
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm md:text-base break-words">
                  View course assignments and schedules
                  {cacheStatus === "cached" && (
                    <span className="ml-2 text-xs text-green-400 whitespace-nowrap">(Loaded from cache)</span>
                  )}
                  {cacheStatus === "fresh" && (
                    <span className="ml-2 text-xs text-blue-400 whitespace-nowrap">(Fresh data)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownload}
                disabled={loading}
                className="flex-1 sm:flex-none px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 glass border border-white/10 rounded-lg hover:border-green-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base min-h-[44px]"
                title="Download all courses as CSV"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                <span className="text-green-400 hidden sm:inline break-words">Download</span>
              </button>
              <button
                onClick={() => loadCoursesData(true)}
                disabled={loading}
                className="flex-1 sm:flex-none px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base min-h-[44px]"
                title="Refresh data"
              >
                <span className="text-cyan-400 break-words">Refresh</span>
              </button>
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

        {/* Courses List */}
        <div className="space-y-6">
          {courseAssignments.map((assignment, index) => (
            <motion.div
              key={assignment.course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass border border-white/10 rounded-xl p-6 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white break-words">
                      {assignment.course.code}
                    </h2>
                    {assignment.course.is_elective && (
                      <span className="px-2 sm:px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-purple-300 text-xs sm:text-sm font-semibold whitespace-nowrap">
                        Elective
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm sm:text-base md:text-lg break-words">{assignment.course.name}</p>
                  {assignment.course.component_types && (
                    <p className="text-gray-500 text-xs sm:text-sm mt-1 break-words">
                      Components: {assignment.course.component_types}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 w-full sm:w-auto">
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-cyan-400">
                      {assignment.classes.length}
                    </div>
                    <div className="text-gray-400 text-xs sm:text-sm">Class(es)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(assignment.course)}
                      className="p-1.5 sm:p-2 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all group min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Edit course"
                      aria-label="Edit course"
                    >
                      <Edit className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(assignment.course)}
                      className="p-1.5 sm:p-2 glass border border-white/10 rounded-lg hover:border-red-500/50 transition-all group min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Delete course"
                      aria-label="Delete course"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              {assignment.classes.length > 0 ? (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    Assigned Classes
                  </h3>
                  {assignment.classes.map((classAssignment, classIndex) => (
                    <motion.div
                      key={classAssignment.class.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: classIndex * 0.05 }}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-white">
                          Class {classAssignment.class.class_code}
                        </h4>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Calendar className="w-4 h-4" />
                          {classAssignment.totalSessions} session(s)
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        {classAssignment.components.map((comp) => (
                          <div
                            key={comp.id}
                            className="p-2 sm:p-3 bg-white/5 border border-white/10 rounded-lg"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
                              <span className="text-white font-semibold text-xs sm:text-sm break-words">
                                {comp.component_type === "L"
                                  ? "Lecture (L)"
                                  : comp.component_type === "S"
                                  ? "Section (S)"
                                  : "Lab (LB)"}
                              </span>
                              <span className="text-gray-400 text-xs whitespace-nowrap">
                                {comp.sessions.length} session(s)
                              </span>
                            </div>
                            {comp.sessions.length > 0 && (
                              <div className="space-y-1 mt-1 sm:mt-2">
                                {comp.sessions.map((session) => (
                                  <div
                                    key={session.id}
                                    className="text-xs text-gray-300 flex items-start gap-1.5 sm:gap-2 break-words"
                                  >
                                    <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    <span className="break-words">{session.day} - Slot {session.slot}</span>
                                    {session.room && (
                                      <>
                                        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                        <span className="break-words">{session.room}</span>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg text-center text-gray-400">
                  Not assigned to any classes yet
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {courseAssignments.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No courses found. Create courses to get started.
          </div>
        )}
      </div>

      {/* Edit Course Modal */}
      {showEditModal && editingCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 break-words">Edit Course</h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-gray-300 mb-2 text-sm sm:text-base break-words">
                  <span className="font-semibold text-white">Course:</span> {editingCourse.code} - {editingCourse.name}
                </p>
              </div>
              
              <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 glass border border-white/10 rounded-lg">
                <input
                  type="checkbox"
                  id="editIsElective"
                  checked={editIsElective}
                  onChange={(e) => setEditIsElective(e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 accent-purple-500 mt-0.5 flex-shrink-0"
                />
                <label htmlFor="editIsElective" className="text-white cursor-pointer flex-1 text-sm sm:text-base break-words">
                  Mark as Elective Course
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 glass border border-white/10 rounded-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    id="editHasLab"
                    checked={editHasLab}
                    onChange={(e) => setEditHasLab(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 accent-cyan-500 mt-0.5 flex-shrink-0"
                  />
                  <label htmlFor="editHasLab" className="text-white cursor-pointer flex-1 text-sm sm:text-base break-words">
                    Include Lab (LB) Component
                  </label>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm break-words ml-6 sm:ml-8">Note: Lecture (L) and Section (S) are always included</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 sm:mt-6">
              <button
                onClick={handleEditSave}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl transition-all text-sm sm:text-base min-h-[44px]"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCourse(null);
                }}
                className="flex-1 px-4 py-2.5 sm:py-3 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all text-sm sm:text-base min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}
