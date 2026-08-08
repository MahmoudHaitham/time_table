"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, BookOpen, X, CheckCircle2, ArrowLeft, User } from "lucide-react";

interface Course {
  id: number;
  code: string;
  name: string;
  is_elective: boolean;
  term_number: string;
  term_id: number;
  system_type?: number; // present when "No specific system" (all systems)
  classes: Array<{ id: number; class_code: string }>;
  component_types?: string;
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SYSTEMS = [180, 160, 140];

export default function OtherSectionPage() {
  const router = useRouter();
  const [systemType, setSystemType] = useState<number | null>(null);
  const [allSystems, setAllSystems] = useState(false); // "No specific system" = mix 140, 160, 180
  const [courses, setCourses] = useState<{ core: Course[]; elective: Course[] }>({ core: [], elective: [] });
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [maxElectives, setMaxElectives] = useState<number>(2); // Default to 2, will be updated from API
  const [instructors, setInstructors] = useState<string[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [studentNameInput, setStudentNameInput] = useState("");
  const [nameModalError, setNameModalError] = useState<string | null>(null);

  // Don't auto-load from sessionStorage - always start with system selection
  // This ensures users always see system selection first when entering "Other" section

  const handleSystemSelect = (selectedSystem: number) => {
    setSystemType(selectedSystem);
    setAllSystems(false);
    sessionStorage.setItem("other_section_system_type", selectedSystem.toString());
    sessionStorage.removeItem("other_section_all_systems");
    loadCourses(selectedSystem, false);
  };

  const handleNoSpecificSystem = () => {
    setSystemType(null);
    setAllSystems(true);
    sessionStorage.removeItem("other_section_system_type");
    sessionStorage.setItem("other_section_all_systems", "true");
    loadCourses(null, true);
  };

  const loadCourses = async (system: number | null, useAllSystems: boolean) => {
    try {
      setLoading(true);
      const response = await studentTimetableAPI.getAllCoursesForOther(system ?? undefined, useAllSystems);
      const allCourses = response.data?.courses || { core: [], elective: [] };
      const coreList = allCourses.core || [];
      const electiveList = allCourses.elective || [];

      let uniqueCore: Course[];
      let uniqueElective: Course[];
      if (useAllSystems) {
        // No specific system: keep all entries (same course can appear per system/term); each has system_type
        uniqueCore = coreList;
        uniqueElective = electiveList;
      } else {
        const seenCoreCodes = new Set<string>();
        const seenElectiveCodes = new Set<string>();
        uniqueCore = coreList.filter((course: Course) => {
          if (seenCoreCodes.has(course.code)) return false;
          seenCoreCodes.add(course.code);
          return true;
        });
        uniqueElective = electiveList.filter((course: Course) => {
          if (seenElectiveCodes.has(course.code)) return false;
          seenElectiveCodes.add(course.code);
          return true;
        });
      }

      console.log(`[OtherSection] Loaded ${uniqueCore.length} core and ${uniqueElective.length} elective courses${useAllSystems ? " (all systems)" : ` for system ${system}`}`);

      setCourses({ core: uniqueCore, elective: uniqueElective });
      setMaxElectives(response.data?.maxElectives ?? 2);
      setSelectedCourses([]);
      setExcludedDays([]);
      setInstructors([]);
      setSelectedInstructors([]);
    } catch (err: any) {
      console.error("[OtherSection] Error loading courses:", err);
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: number) => {
    const course = [...courses.core, ...courses.elective].find(c => c.id === courseId);
    if (!course) return;

    // Check if it's an elective
    if (course.is_elective) {
      const currentElectiveCount = selectedCourses.filter(id => {
        const c = [...courses.core, ...courses.elective].find(c => c.id === id);
        return c?.is_elective;
      }).length;

      if (selectedCourses.includes(courseId)) {
        // Deselecting
        setSelectedCourses(selectedCourses.filter(id => id !== courseId));
      } else {
        // Selecting - check limit
        if (maxElectives > 0 && currentElectiveCount >= maxElectives) {
          setError(`Maximum ${maxElectives} elective course${maxElectives > 1 ? 's' : ''} allowed`);
          setTimeout(() => setError(null), 3000);
          return;
        }
        setSelectedCourses([...selectedCourses, courseId]);
      }
    } else {
      // Core course - toggle normally
      if (selectedCourses.includes(courseId)) {
        setSelectedCourses(selectedCourses.filter(id => id !== courseId));
      } else {
        setSelectedCourses([...selectedCourses, courseId]);
      }
    }
    // Instructors will be reloaded automatically via useEffect
  };

  const toggleInstructor = (instructorName: string) => {
    if (selectedInstructors.includes(instructorName)) {
      setSelectedInstructors(selectedInstructors.filter(name => name !== instructorName));
    } else {
      setSelectedInstructors([...selectedInstructors, instructorName]);
    }
  };

  useEffect(() => {
    const inCourseMode = systemType != null || allSystems;
    if (!inCourseMode || selectedCourses.length === 0) {
      setInstructors([]);
      setSelectedInstructors([]);
      return;
    }

    const loadInstructorsAsync = async () => {
      try {
        const instructorsRes = await studentTimetableAPI.getInstructorsForCourses(
          allSystems ? null : systemType!,
          selectedCourses
        ).catch((err) => {
          console.error("Error loading instructors:", err);
          return { data: [] };
        });
        const instructorsData = instructorsRes?.data || [];
        setInstructors(instructorsData);
        setSelectedInstructors(prev => prev.filter(name => instructorsData.includes(name)));
      } catch (err: any) {
        console.error("Error loading instructors:", err);
        setInstructors([]);
      }
    };

    loadInstructorsAsync();
  }, [selectedCourses, systemType, allSystems]);

  const toggleDay = (day: string) => {
    if (excludedDays.includes(day)) {
      setExcludedDays(excludedDays.filter(d => d !== day));
    } else {
      setExcludedDays([...excludedDays, day]);
    }
  };

  const handleGenerateSchedulesClick = () => {
    const inCourseMode = systemType != null || allSystems;
    if (!inCourseMode) {
      setError("Please select a system or No specific system first");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (selectedCourses.length === 0) {
      setError("Please select at least one course");
      setTimeout(() => setError(null), 3000);
      return;
    }
    const electiveCount = selectedCourses.filter(id => {
      const c = [...courses.core, ...courses.elective].find(c => c.id === id);
      return c?.is_elective;
    }).length;
    if (maxElectives > 0 && electiveCount > maxElectives) {
      setError(`Maximum ${maxElectives} elective course${maxElectives > 1 ? 's' : ''} allowed`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    setShowNameModal(true);
    setStudentNameInput("");
    setNameModalError(null);
  };

  const handleGenerateSchedules = async () => {
    const name = studentNameInput.trim();
    if (!name) {
      setNameModalError("Please enter your name.");
      return;
    }
    setNameModalError(null);
    setShowNameModal(false);

    try {
      setGenerating(true);
      setError(null);

      const response = await studentTimetableAPI.generateOtherSectionSchedules({
        selectedCourseIds: selectedCourses,
        excludedDays,
        preferredInstructors: selectedInstructors.length > 0 ? selectedInstructors : undefined,
        ...(allSystems ? { allSystems: true } : { systemType: systemType! }),
        studentName: name,
      });

      sessionStorage.setItem("other_section_schedules", JSON.stringify(response.data || []));
      sessionStorage.setItem("other_section_selected_courses", JSON.stringify(selectedCourses));
      sessionStorage.setItem("other_section_excluded_days", JSON.stringify(excludedDays));

      router.push("/student/timetable/other/schedules");
    } catch (err: any) {
      setError(err.message || "Failed to generate schedules");
    } finally {
      setGenerating(false);
    }
  };

  const selectedElectiveCount = selectedCourses.filter(id => {
    const c = [...courses.core, ...courses.elective].find(c => c.id === id);
    return c?.is_elective;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen p-6 sm:p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading courses...</p>
        </div>
      </div>
    );
  }

  // Full-page loading while generating schedules (until schedule is made)
  if (generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center px-6"
        >
          <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-8"></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Generating your schedules</h2>
          <p className="text-gray-400 text-base sm:text-lg mb-2">Finding the best combinations for your selected courses...</p>
          <p className="text-gray-500 text-sm">This may take a few moments. Please wait.</p>
        </motion.div>
      </div>
    );
  }

  const showSystemPicker = !systemType && !allSystems;

  if (showSystemPicker) {
    return (
      <div className="min-h-screen p-6 sm:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/student/timetable")}
                className="p-3 glass border border-white/10 rounded-xl hover:border-purple-500/50 hover:bg-white/5 transition-all"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div className="p-5 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-2xl shadow-lg shadow-purple-500/20">
                <Calendar className="w-10 h-10 text-purple-400" />
              </div>
              <div>
                <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                  Other <span className="text-gradient">Section</span>
                </h1>
                <p className="text-gray-400 text-lg">Select your academic system or mix all systems</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-xl shadow-lg shadow-purple-500/20">
                <Calendar className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Select Academic System</h2>
                <p className="text-gray-400">Choose one system or &quot;No specific system&quot; to mix courses from 140, 160, and 180</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SYSTEMS.map((system, idx) => (
                <motion.button
                  key={system}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handleSystemSelect(system)}
                  className="p-8 glass border rounded-2xl transition-all border-white/10 hover:border-purple-500/50 hover:bg-white/5 hover:scale-105"
                >
                  <div className="text-white font-bold text-4xl mb-2">{system}</div>
                  <div className="text-gray-400 text-sm">System {system}</div>
                </motion.button>
              ))}
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleNoSpecificSystem}
                className="p-8 glass border rounded-2xl transition-all border-white/10 hover:border-purple-500/50 hover:bg-white/5 hover:scale-105 border-dashed"
              >
                <div className="text-white font-bold text-xl sm:text-2xl mb-2">No specific system</div>
                <div className="text-gray-400 text-sm">Mix courses from System 140, 160 & 180</div>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

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
              onClick={() => {
                setSystemType(null);
                setAllSystems(false);
                sessionStorage.removeItem("other_section_system_type");
                sessionStorage.removeItem("other_section_all_systems");
                setCourses({ core: [], elective: [] });
                setSelectedCourses([]);
                setExcludedDays([]);
              }}
              className="p-3 glass border border-white/10 rounded-xl hover:border-purple-500/50 hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="p-5 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-2xl shadow-lg shadow-purple-500/20">
              <Calendar className="w-10 h-10 text-purple-400" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                Other <span className="text-gradient">Section</span>
                {allSystems ? " – No specific system" : ` – System ${systemType}`}
              </h1>
              <p className="text-gray-400 text-lg">
                {allSystems ? "Select courses from any system and term; combinations can mix 140, 160 & 180" : "Select courses manually from all available terms"}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          {/* Core Courses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-xl shadow-lg shadow-cyan-500/20">
                <BookOpen className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Core Courses ({courses.core.length})
                </h2>
                <p className="text-gray-400">
                  Select core courses from all available terms
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.core.map((course, idx) => {
                const isSelected = selectedCourses.includes(course.id);
                return (
                  <motion.button
                    key={allSystems ? `core-${course.id}-${course.term_id}-${course.system_type ?? 0}-${idx}` : `core-${course.id}-${course.term_id}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.03 }}
                    onClick={() => toggleCourse(course.id)}
                    className={`relative px-5 py-4 rounded-xl text-white transition-all hover:shadow-lg hover:scale-105 ${
                      isSelected
                        ? "bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/50 shadow-xl shadow-cyan-500/30"
                        : "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/50 hover:from-cyan-500/30 hover:to-blue-600/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-bold text-base mb-1">{course.code}</div>
                        <div className="text-sm text-gray-200">{course.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {allSystems && course.system_type ? `System ${course.system_type} • Term ${course.term_number}` : `Term: ${course.term_number}`}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-cyan-300 flex-shrink-0" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Elective Courses */}
          {courses.elective.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-xl shadow-lg shadow-purple-500/20">
                  <BookOpen className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Elective Courses ({courses.elective.length})
                  </h2>
                  <p className="text-gray-400">
                    Select up to {maxElectives} elective course{maxElectives > 1 ? 's' : ''} from all available terms
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.elective.map((course, idx) => {
                  const isSelected = selectedCourses.includes(course.id);
                  const canSelect = !isSelected && maxElectives > 0 && selectedElectiveCount < maxElectives;
                  return (
                    <motion.button
                      key={allSystems ? `elective-${course.id}-${course.term_id}-${course.system_type ?? 0}-${idx}` : `elective-${course.id}-${course.term_id}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      onClick={() => toggleCourse(course.id)}
                      disabled={!canSelect && !isSelected}
                      className={`p-6 glass border rounded-2xl transition-all text-left ${
                        isSelected
                          ? "border-purple-500 bg-gradient-to-br from-purple-500/30 to-pink-600/30 shadow-xl shadow-purple-500/30 scale-105"
                          : canSelect
                          ? "border-white/10 hover:border-purple-500/50 hover:bg-white/5 hover:scale-105"
                          : "border-white/10 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className={`font-bold text-xl mb-2 ${isSelected ? "text-purple-100" : "text-white"}`}>
                            {course.code}
                          </div>
                          <div className={`text-sm ${isSelected ? "text-purple-200" : "text-gray-400"} mb-1`}>
                            {course.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {allSystems && course.system_type ? `System ${course.system_type} • Term ${course.term_number}` : `Term: ${course.term_number}`}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-7 h-7 text-purple-300 flex-shrink-0 ml-4" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              {selectedElectiveCount > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-base text-gray-400">
                    Selected: <span className="text-purple-400 font-bold text-lg">{selectedElectiveCount}/{maxElectives}</span>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Preferred Instructors Selection */}
          {instructors.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-xl shadow-lg shadow-green-500/20">
                  <User className="w-7 h-7 text-green-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Preferred Instructors (Optional)
                  </h2>
                  <p className="text-gray-400">
                    Select instructors you prefer. Schedules with more preferred instructors will rank higher.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {instructors.map((instructor, idx) => (
                  <motion.button
                    key={instructor}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + idx * 0.02 }}
                    onClick={() => toggleInstructor(instructor)}
                    className={`p-4 glass border rounded-xl transition-all text-left ${
                      selectedInstructors.includes(instructor)
                        ? "border-green-500 bg-gradient-to-br from-green-500/30 to-emerald-600/30 shadow-xl shadow-green-500/30 scale-105"
                        : "border-white/10 hover:border-green-500/50 hover:bg-white/5 hover:scale-105"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className={`font-semibold text-base ${selectedInstructors.includes(instructor) ? "text-green-100" : "text-white"}`}>
                          {instructor}
                        </div>
                      </div>
                      {selectedInstructors.includes(instructor) && (
                        <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0 ml-3" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
              {selectedInstructors.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-base text-gray-400">
                    Selected: <span className="text-green-400 font-bold text-lg">{selectedInstructors.length}</span> instructor{selectedInstructors.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-green-300 mt-2">
                    ✓ Schedules with these instructors will be prioritized
                  </p>
                </div>
              )}
            </motion.div>
          ) : selectedCourses.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-gray-500/30 to-gray-600/30 rounded-xl shadow-lg shadow-gray-500/20">
                  <User className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Preferred Instructors (Optional)
                  </h2>
                  <p className="text-gray-400">
                    No instructors found for selected courses. Instructors will appear here once they are assigned to course sessions.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {/* Excluded Days Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-gradient-to-br from-red-500/30 to-orange-600/30 rounded-xl shadow-lg shadow-red-500/20">
                <X className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Days to Exclude
                </h2>
                <p className="text-gray-400">
                  Select days you don't want to come to college. The system will try to minimize these days.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
              {DAYS.map((day, idx) => (
                <motion.button
                  key={day}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  onClick={() => toggleDay(day)}
                  className={`p-6 glass border rounded-2xl transition-all ${
                    excludedDays.includes(day)
                      ? "border-red-500 bg-gradient-to-br from-red-500/30 to-orange-600/30 shadow-xl shadow-red-500/30 scale-105"
                      : "border-white/10 hover:border-red-500/50 hover:bg-white/5 hover:scale-105"
                  }`}
                >
                  <div className={`font-bold text-lg mb-3 ${excludedDays.includes(day) ? "text-red-100" : "text-white"}`}>
                    {day}
                  </div>
                  {excludedDays.includes(day) && (
                    <X className="w-6 h-6 text-red-300 mx-auto" />
                  )}
                </motion.button>
              ))}
            </div>
            {excludedDays.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-base text-gray-400">
                  Excluding: <span className="text-red-400 font-bold text-lg">{excludedDays.length} day(s)</span>
                </p>
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-5 pt-6"
          >
            <button
              onClick={() => router.push("/student/timetable")}
              className="px-8 py-4 glass border border-white/10 rounded-xl font-semibold text-white hover:border-gray-500/50 hover:bg-white/5 transition-all order-2 sm:order-1 text-lg"
            >
              Back to Main
            </button>
            <button
              onClick={() => {
                setSystemType(null);
                sessionStorage.removeItem("other_section_system_type");
                setCourses({ core: [], elective: [] });
                setSelectedCourses([]);
                setExcludedDays([]);
                setSelectedInstructors([]);
              }}
              className="px-8 py-4 glass border border-white/10 rounded-xl font-semibold text-white hover:border-purple-500/50 hover:bg-white/5 transition-all order-3 sm:order-2 text-lg"
            >
              Change System
            </button>
            <button
              onClick={handleGenerateSchedulesClick}
              disabled={generating || selectedCourses.length === 0}
              className="flex-1 px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 order-1 sm:order-2"
            >
              <Calendar className="w-6 h-6" />
              Generate Schedules
            </button>
          </motion.div>

          {/* Name modal before generating */}
          {showNameModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass backdrop-blur-xl border border-purple-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-purple-500/20"
              >
                <h3 className="text-xl font-bold text-white mb-2">Generate Schedules</h3>
                <p className="text-gray-300 mb-4">Schedules will be generated now. Please enter your name.</p>
                <input
                  type="text"
                  value={studentNameInput}
                  onChange={(e) => { setStudentNameInput(e.target.value); setNameModalError(null); }}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none mb-2"
                  required
                />
                {nameModalError && <p className="text-red-400 text-sm mb-2">{nameModalError}</p>}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { setShowNameModal(false); setStudentNameInput(""); setNameModalError(null); }}
                    className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateSchedules}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/50 hover:scale-[1.02] transition-all"
                  >
                    Okay
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Selection Summary */}
          {selectedCourses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-4">Selection Summary</h3>
              <div className="space-y-2">
                <p className="text-gray-300">
                  <span className="font-semibold">Total Courses:</span> {selectedCourses.length}
                </p>
                <p className="text-gray-300">
                  <span className="font-semibold">Core Courses:</span> {selectedCourses.filter(id => {
                    const c = [...courses.core, ...courses.elective].find(c => c.id === id);
                    return c && !c.is_elective;
                  }).length}
                </p>
                <p className="text-gray-300">
                  <span className="font-semibold">Elective Courses:</span> {selectedElectiveCount}/{maxElectives}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
