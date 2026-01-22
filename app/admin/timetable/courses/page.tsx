"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { coursesAPI, classesAPI, classCoursesAPI, componentsAPI, sessionsAPI, termsAPI } from "@/lib/api/timetable";
import { ArrowLeft, BookOpen, Users, Calendar, MapPin, Clock, CheckCircle2, XCircle, Edit, Trash2 } from "lucide-react";
import AlertModal from "@/components/ui/AlertModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

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
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadCoursesData();
  }, [router]);

  const loadCoursesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all courses
      const coursesRes = await coursesAPI.getAll();
      const allCourses = coursesRes.data || [];
      setCourses(allCourses);

      // Get all terms first
      const termsRes = await termsAPI.getAll();
      const allTerms = termsRes.data || [];
      
      // Load all classes from all terms
      const classesMap = new Map<number, Class>();
      
      for (const term of allTerms) {
        try {
          const classesRes = await classesAPI.getByTerm(term.id);
          const termClasses = classesRes.data || [];
          termClasses.forEach((cls: Class) => {
            classesMap.set(cls.id, cls);
          });
        } catch (err) {
          console.error(`Failed to load classes for term ${term.id}:`, err);
        }
      }

      // Now get class courses for each class
      const classCourseMap = new Map<number, ClassCourse[]>();
      
      for (const [classId, classItem] of classesMap.entries()) {
        try {
          const classCoursesRes = await classCoursesAPI.getByClass(classId);
          const classCourses = classCoursesRes.data || [];
          classCourseMap.set(classId, classCourses);
        } catch (err) {
          console.error(`Failed to load class courses for class ${classId}:`, err);
        }
      }

      // Build the assignments structure
      const finalAssignments: CourseAssignment[] = [];

      for (const course of allCourses) {
        const courseClasses: CourseAssignment["classes"] = [];

        for (const [classId, classCourses] of classCourseMap.entries()) {
          const classCourse = classCourses.find(cc => cc.course_id === course.id);
          if (classCourse) {
            const classItem = classesMap.get(classId);
            if (classItem) {
              // Get components for this class course
              try {
                const componentsRes = await componentsAPI.getByClassCourse(classCourse.id);
                const components = componentsRes.data || [];
                
                // Get sessions for each component
                const componentsWithSessions = await Promise.all(
                  components.map(async (comp: Component) => {
                    try {
                      const sessionsRes = await sessionsAPI.getByComponent(comp.id);
                      return {
                        ...comp,
                        sessions: sessionsRes.data || [],
                      };
                    } catch (err) {
                      return {
                        ...comp,
                        sessions: [],
                      };
                    }
                  })
                );

                const totalSessions = componentsWithSessions.reduce(
                  (sum, comp) => sum + comp.sessions.length,
                  0
                );

                courseClasses.push({
                  class: classItem,
                  components: componentsWithSessions,
                  totalSessions,
                });
              } catch (err) {
                console.error(`Failed to load components for class course ${classCourse.id}:`, err);
              }
            }
          }
        }

        finalAssignments.push({
          course,
          classes: courseClasses,
        });
      }

      setCourseAssignments(finalAssignments);
    } catch (err: any) {
      console.error("Failed to load courses data:", err);
      setError(err.message || "Failed to load courses data");
    } finally {
      setLoading(false);
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
      
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Course Updated Successfully!",
        message: `Course "${editingCourse.code}" has been updated successfully!`,
      });
      
      setShowEditModal(false);
      setEditingCourse(null);
      loadCoursesData();
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
          
          setAlertModal({
            isOpen: true,
            type: "success",
            title: "Course Deleted Successfully!",
            message: `Course "${course.code}" has been deleted successfully!`,
          });
          
          loadCoursesData();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading courses...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-cyan-500/20 rounded-xl">
              <BookOpen className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-5xl font-bold mb-2">
                All <span className="text-gradient">Courses</span>
              </h1>
              <p className="text-gray-400">View course assignments and schedules</p>
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
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      {assignment.course.code}
                    </h2>
                    {assignment.course.is_elective && (
                      <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-purple-300 text-sm font-semibold">
                        Elective
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-lg">{assignment.course.name}</p>
                  {assignment.course.component_types && (
                    <p className="text-gray-500 text-sm mt-1">
                      Components: {assignment.course.component_types}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-3xl font-bold text-cyan-400">
                      {assignment.classes.length}
                    </div>
                    <div className="text-gray-400 text-sm">Class(es)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(assignment.course)}
                      className="p-2 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all group"
                      title="Edit course"
                    >
                      <Edit className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(assignment.course)}
                      className="p-2 glass border border-white/10 rounded-lg hover:border-red-500/50 transition-all group"
                      title="Delete course"
                    >
                      <Trash2 className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
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
                            className="p-3 bg-white/5 border border-white/10 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-semibold">
                                {comp.component_type === "L"
                                  ? "Lecture (L)"
                                  : comp.component_type === "S"
                                  ? "Section (S)"
                                  : "Lab (LB)"}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {comp.sessions.length} session(s)
                              </span>
                            </div>
                            {comp.sessions.length > 0 && (
                              <div className="space-y-1 mt-2">
                                {comp.sessions.map((session) => (
                                  <div
                                    key={session.id}
                                    className="text-xs text-gray-300 flex items-center gap-2"
                                  >
                                    <Clock className="w-3 h-3" />
                                    {session.day} - Slot {session.slot}
                                    {session.room && (
                                      <>
                                        <MapPin className="w-3 h-3 ml-2" />
                                        {session.room}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Edit Course</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-300 mb-2">
                  <span className="font-semibold text-white">Course:</span> {editingCourse.code} - {editingCourse.name}
                </p>
              </div>
              
              <div className="flex items-center gap-3 p-4 glass border border-white/10 rounded-lg">
                <input
                  type="checkbox"
                  id="editIsElective"
                  checked={editIsElective}
                  onChange={(e) => setEditIsElective(e.target.checked)}
                  className="w-5 h-5 accent-purple-500"
                />
                <label htmlFor="editIsElective" className="text-white cursor-pointer flex-1">
                  Mark as Elective Course
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 glass border border-white/10 rounded-lg">
                <input
                  type="checkbox"
                  id="editHasLab"
                  checked={editHasLab}
                  onChange={(e) => setEditHasLab(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500"
                />
                <label htmlFor="editHasLab" className="text-white cursor-pointer flex-1">
                  Include Lab (LB) Component
                </label>
                <p className="text-gray-400 text-xs">Note: Lecture (L) and Section (S) are always included</p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleEditSave}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCourse(null);
                }}
                className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all"
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
