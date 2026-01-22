"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { otherDeptAPI } from "@/lib/api/timetable";
import { ArrowLeft, Plus, BookOpen, Calendar, MapPin, User, XCircle, Trash2, Save } from "lucide-react";
import AlertModal from "@/components/ui/AlertModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Course {
  id: number;
  code: string;
  name: string;
  component_types: string;
  components: Component[];
}

interface Component {
  id: number;
  component_type: "L" | "S" | "LB";
  sessions: Session[];
}

interface Session {
  id: number;
  day: string;
  slot: number;
  room: string | null;
  instructor: string | null;
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SLOTS = [1, 2, 3, 4];

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

export default function CoursesForOtherDeptPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: "", name: "", hasLab: false });
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ day: string; slot: number; component: Component } | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionData, setSessionData] = useState({ room: "", instructor: "" });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; onClose?: () => void; type?: "danger" | "warning" | "info"; confirmText?: string; cancelText?: string; showIcon?: boolean }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadCourses();
  }, [router]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await otherDeptAPI.getCourses();
      setCourses(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await otherDeptAPI.createCourse(newCourse);
      setNewCourse({ code: "", name: "", hasLab: false });
      setShowCreateModal(false);
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Success",
        message: "Course created successfully",
      });
      loadCourses();
    } catch (err: any) {
      setError(err.message || "Failed to create course");
    }
  };

  const handleCellClick = (day: string, slot: number, component: Component) => {
    setSelectedCell({ day, slot, component });
    const existingSession = component.sessions?.find(s => s.day === day && s.slot === slot);
    if (existingSession) {
      setSessionData({
        room: existingSession.room || "",
        instructor: existingSession.instructor || "",
      });
    } else {
      setSessionData({ room: "", instructor: "" });
    }
    setShowSessionModal(true);
  };

  const handleSaveSession = async () => {
    if (!selectedCell || !selectedCourse) return;

    try {
      setError(null);
      await otherDeptAPI.upsertSession(selectedCell.component.id, {
        day: selectedCell.day,
        slot: selectedCell.slot,
        room: sessionData.room || undefined,
        instructor: sessionData.instructor || undefined,
      });
      setShowSessionModal(false);
      setSelectedCell(null);
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Success",
        message: "Session saved successfully",
      });
      loadCourses();
    } catch (err: any) {
      setError(err.message || "Failed to save session");
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedCell) return;

    try {
      setError(null);
      await otherDeptAPI.deleteSession(selectedCell.component.id, selectedCell.day, selectedCell.slot);
      setShowSessionModal(false);
      setSelectedCell(null);
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Success",
        message: "Session deleted successfully",
      });
      loadCourses();
    } catch (err: any) {
      setError(err.message || "Failed to delete session");
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Course",
      message: "Are you sure you want to delete this course? This will delete all associated sessions.",
      type: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      showIcon: true,
      onConfirm: async () => {
        try {
          setError(null);
          await otherDeptAPI.deleteCourse(courseId);
          setConfirmModal({ ...confirmModal, isOpen: false });
          setAlertModal({
            isOpen: true,
            type: "success",
            title: "Success",
            message: "Course deleted successfully",
          });
          loadCourses();
          if (selectedCourse?.id === courseId) {
            setSelectedCourse(null);
          }
        } catch (err: any) {
          setError(err.message || "Failed to delete course");
        }
      },
    });
  };

  const getCellContent = (component: Component, day: string, slot: number): Session | null => {
    return component.sessions?.find(s => s.day === day && s.slot === slot) || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/admin/timetable")}
              className="p-3 glass border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="p-5 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-2xl shadow-lg shadow-green-500/20">
              <BookOpen className="w-10 h-10 text-green-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-bold mb-2">
                Courses for <span className="text-gradient">Other Departments</span>
              </h1>
              <p className="text-gray-400 text-lg">Manage courses and schedules for other departments</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-green-500/50 hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Course
            </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {courses.map((course, idx) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 glass border rounded-xl cursor-pointer transition-all ${
                selectedCourse?.id === course.id
                  ? "border-green-500 bg-green-500/10"
                  : "border-white/10 hover:border-green-500/50"
              }`}
              onClick={() => setSelectedCourse(course)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{course.code}</h3>
                  <p className="text-sm text-gray-400">{course.name}</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {course.component_types.split(",").map((type) => (
                      <span
                        key={type}
                        className={`px-2 py-1 text-xs rounded ${
                          type.trim() === "L"
                            ? "bg-red-500/20 text-red-400"
                            : type.trim() === "S"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {type.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCourse(course.id);
                  }}
                  className="p-2 glass border border-red-500/30 rounded-lg hover:border-red-500 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {courses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400 glass border border-white/10 rounded-xl"
          >
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-semibold mb-2">No courses found</p>
            <p className="text-sm">Create your first course to get started</p>
          </motion.div>
        )}

        {/* Timetable for Selected Course */}
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {selectedCourse.code} - {selectedCourse.name}
                </h2>
                <p className="text-gray-400">Click on slots to add/edit sessions</p>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-2 glass border border-white/10 rounded-lg hover:border-gray-500/50 transition-all"
              >
                <XCircle className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Components Tabs */}
            <div className="mb-6 flex gap-2 flex-wrap">
              {selectedCourse.components.map((component) => (
                <div key={component.id} className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-lg text-sm ${
                        component.component_type === "L"
                          ? "bg-red-500/20 text-red-400"
                          : component.component_type === "S"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {component.component_type === "L"
                        ? "Lecture"
                        : component.component_type === "S"
                        ? "Section"
                        : "Lab"}
                    </span>
                  </h3>

                  {/* Timetable Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-3 text-left text-white font-semibold border border-white/10">Day / Slot</th>
                          {SLOTS.map((slot) => (
                            <th key={slot} className="p-3 text-center text-white font-semibold border border-white/10 min-w-[150px]">
                              {slot}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map((day) => (
                          <tr key={day}>
                            <td className="p-3 text-white font-semibold border border-white/10">{day}</td>
                            {SLOTS.map((slot) => {
                              const session = getCellContent(component, day, slot);
                              return (
                                <td
                                  key={slot}
                                  className="p-2 border border-white/10 cursor-pointer hover:bg-white/5 transition-colors min-w-[150px]"
                                  onClick={() => handleCellClick(day, slot, component)}
                                >
                                  {session ? (
                                    <div className={`p-2 rounded-lg ${getSlotColor(component.component_type)}`}>
                                      <div className="text-xs font-semibold text-white">
                                        {session.instructor || "No instructor"}
                                      </div>
                                      {session.room && (
                                        <div className="text-xs text-gray-300 mt-1 flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {session.room}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-xs text-center py-4">—</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Create Course for Other Departments</h2>
            <form onSubmit={handleCreateCourse}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Course Code</label>
                <input
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  placeholder="e.g., CS101"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Course Name</label>
                <input
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  placeholder="e.g., Data Structures"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCourse.hasLab}
                    onChange={(e) => setNewCourse({ ...newCourse, hasLab: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-gray-300">Include Lab (LB) component</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  Note: Lecture (L) and Section (S) components are always included
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-green-500/50 hover:shadow-xl transition-all"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCourse({ code: "", name: "", hasLab: false });
                  }}
                  className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && selectedCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              {selectedCell.component.component_type === "L" ? "Lecture" : selectedCell.component.component_type === "S" ? "Section" : "Lab"} Session
            </h2>
            <p className="text-gray-400 mb-4">
              {selectedCell.day} - Slot {selectedCell.slot}
            </p>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Instructor</label>
              <input
                type="text"
                value={sessionData.instructor}
                onChange={(e) => setSessionData({ ...sessionData, instructor: e.target.value })}
                className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                placeholder="Enter instructor name"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Room</label>
              <input
                type="text"
                value={sessionData.room}
                onChange={(e) => setSessionData({ ...sessionData, room: e.target.value })}
                className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                placeholder="Enter room number"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleSaveSession}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-green-500/50 hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              {selectedCell.component.sessions?.some(s => s.day === selectedCell.day && s.slot === selectedCell.slot) && (
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Delete Session",
                      message: "Are you sure you want to delete this session?",
                      type: "danger",
                      confirmText: "Delete",
                      cancelText: "Cancel",
                      onConfirm: () => {
                        handleDeleteSession();
                        setConfirmModal({ ...confirmModal, isOpen: false });
                      },
                    });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold shadow-lg shadow-red-500/50 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <button
                onClick={() => {
                  setShowSessionModal(false);
                  setSelectedCell(null);
                }}
                className="px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all"
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
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || "warning"}
        confirmText={confirmModal.confirmText || "Confirm"}
        cancelText={confirmModal.cancelText || "Cancel"}
        showIcon={confirmModal.showIcon}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
