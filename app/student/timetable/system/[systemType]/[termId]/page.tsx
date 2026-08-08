"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, BookOpen, X, CheckCircle2, Trash2, ArrowLeft, User, Lock } from "lucide-react";

interface Course {
  id: number;
  code: string;
  name: string;
  is_elective: boolean;
  component_types?: string;
  /** True when this elective is closed in all classes for this term; student cannot select it. */
  closedInAllClasses?: boolean;
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

export default function SystemPreferencesPage() {
  const router = useRouter();
  const params = useParams();
  const termToken = params.termId as string;
  const systemType = parseInt(params.systemType as string);

  const [coreCourses, setCoreCourses] = useState<Course[]>([]);
  const [electiveCourses, setElectiveCourses] = useState<Course[]>([]);
  const [selectedElectives, setSelectedElectives] = useState<number[]>([]);
  const [excludedCoreCourses, setExcludedCoreCourses] = useState<number[]>([]);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);
  const [allClassesTimetable, setAllClassesTimetable] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxElectives, setMaxElectives] = useState<number>(2); // Default to 2, will be updated from API
  const [instructors, setInstructors] = useState<string[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [termNumber, setTermNumber] = useState<number | null>(null);
  const [campusTrack, setCampusTrack] = useState<"northampton" | "normal" | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [studentNameInput, setStudentNameInput] = useState("");
  const [nameModalError, setNameModalError] = useState<string | null>(null);

  useEffect(() => {
    if (termToken && systemType) {
      loadCourses();
    }
  }, [termToken, systemType]);

  // Load term number and campus track from sessionStorage on mount
  useEffect(() => {
    if (termToken) {
      const storedTermNum = sessionStorage.getItem(`term_number_${termToken}`);
      if (storedTermNum) {
        setTermNumber(parseInt(storedTermNum));
      }
      
      // Load campus track for Term 4 System 140 (NORTHAMPTON separation)
      const storedCampusTrack = sessionStorage.getItem(`campus_track_${termToken}`);
      if (storedCampusTrack && (storedCampusTrack === "northampton" || storedCampusTrack === "normal")) {
        setCampusTrack(storedCampusTrack);
      }
    }
  }, [termToken]);


  const loadCourses = async () => {
    if (!termToken || !systemType) return;
    
    try {
      setLoading(true);
      const [coreRes, electiveRes, timetableRes] = await Promise.all([
        studentTimetableAPI.getCoreCourses(termToken, systemType),
        studentTimetableAPI.getElectiveCourses(termToken, systemType),
        studentTimetableAPI.getTermTimetable(termToken).catch(() => ({ data: null })),
      ]);
      
      setCoreCourses(coreRes.data || []);
      setElectiveCourses(electiveRes.data || []);
      setMaxElectives(electiveRes.maxElectives || 2); // Get maxElectives from API response
      setAllClassesTimetable(timetableRes.data || null);
      setSelectedElectives([]);
      setExcludedCoreCourses([]);
      setExcludedDays([]);
      setSelectedInstructors([]);

      // Store term number and token if available
      if (timetableRes.data?.term?.term_number) {
        const termNum = timetableRes.data.term.term_number;
        sessionStorage.setItem(`term_number_${termToken}`, termNum.toString());
        sessionStorage.setItem(`term_token_${termToken}`, termToken);
        setTermNumber(termNum);
      } else {
        // Try to get from sessionStorage if already stored
        const storedTermNum = sessionStorage.getItem(`term_number_${termToken}`);
        if (storedTermNum) {
          setTermNumber(parseInt(storedTermNum));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  // Load instructors when courses are loaded or selections change
  useEffect(() => {
    if (!termToken || !systemType || coreCourses.length === 0) return;
    
    const loadInstructorsAsync = async () => {
      try {
        const selectedCoreCourseIds = coreCourses
          .filter(course => !excludedCoreCourses.includes(course.id))
          .map(course => course.id);
        
        const selectedCourseIds = [...selectedCoreCourseIds, ...selectedElectives];
        console.log("Loading instructors for selected courses:", selectedCourseIds);
        
        const instructorsRes = await studentTimetableAPI.getInstructorsForTerm(
          termToken, 
          systemType, 
          selectedCourseIds.length > 0 ? selectedCourseIds : undefined,
          campusTrack || undefined // Pass campus track to filter instructors by NORTHAMPTON/Normal classes
        ).catch((err) => {
          console.error("Error loading instructors:", err);
          return { data: [] };
        });
        
        const instructorsData = instructorsRes?.data || [];
        setInstructors(instructorsData);
        console.log("Loaded instructors:", instructorsData.length, instructorsData);
        
        // Remove selected instructors that are no longer in the list
        setSelectedInstructors(prev => 
          prev.filter(name => instructorsData.includes(name))
        );
      } catch (err: any) {
        console.error("Error loading instructors:", err);
        setInstructors([]);
      }
    };
    
    loadInstructorsAsync();
  }, [coreCourses, selectedElectives, excludedCoreCourses, termToken, systemType, campusTrack]);

  const handleGenerateSchedules = async () => {
    if (!termToken || !systemType) return;
    
    if (maxElectives > 0 && selectedElectives.length > maxElectives) {
      setError(`Maximum ${maxElectives} elective course${maxElectives > 1 ? 's' : ''} allowed`);
      return;
    }

    // Secondary check: never send closed electives (filter out in case of stale state)
    const allowedElectives = selectedElectives.filter(
      (id) => !electiveCourses.some((c) => c.id === id && c.closedInAllClasses === true)
    );

    // Store preferences in sessionStorage for the schedules page (using token as key)
    sessionStorage.setItem(`timetable_preferences_${termToken}`, JSON.stringify({
      excludedDays,
      electiveCourseIds: allowedElectives.length > 0 ? allowedElectives : undefined,
      excludedCoreCourseIds: excludedCoreCourses.length > 0 ? excludedCoreCourses : undefined,
      preferredInstructors: selectedInstructors.length > 0 ? selectedInstructors : undefined,
      systemType,
      campusTrack: campusTrack || undefined, // Include campus track for Term 4 System 140
    }));

    router.push(`/student/timetable/system/${systemType}/${termToken}/schedules`);
  };

  const handleGenerateSchedulesClick = () => {
    if (!termToken || !systemType) return;
    if (maxElectives > 0 && selectedElectives.length > maxElectives) {
      setError(`Maximum ${maxElectives} elective course${maxElectives > 1 ? "s" : ""} allowed`);
      return;
    }
    // Secondary check: block if any selected elective is closed
    const closedSelected = electiveCourses.filter(
      (c) => selectedElectives.includes(c.id) && c.closedInAllClasses === true
    );
    if (closedSelected.length > 0) {
      const namesList = closedSelected.map((c) => `"${c.name}" (${c.code})`).join(", ");
      setError(
        closedSelected.length === 1
          ? `The elective ${namesList} is closed for this term. Please remove it and choose another.`
          : `The following electives are closed for this term. Please remove them: ${namesList}.`
      );
      return;
    }
    setError(null);
    setShowNameModal(true);
    setStudentNameInput("");
    setNameModalError(null);
  };

  const handleNameModalCancel = () => {
    setShowNameModal(false);
    setStudentNameInput("");
    setNameModalError(null);
  };

  const handleNameModalConfirm = () => {
    const name = studentNameInput.trim();
    if (!name) {
      setNameModalError("Please enter your name.");
      return;
    }
    setNameModalError(null);
    setShowNameModal(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`generation_student_name_${termToken}`, name);
    }
    handleGenerateSchedules();
  };

  const toggleDay = (day: string) => {
    if (excludedDays.includes(day)) {
      setExcludedDays(excludedDays.filter(d => d !== day));
    } else {
      setExcludedDays([...excludedDays, day]);
    }
  };

  const toggleElective = (courseId: number, closedInAllClasses?: boolean) => {
    if (closedInAllClasses) return; // Handled by onClick alert; should not select
    if (selectedElectives.includes(courseId)) {
      setSelectedElectives(selectedElectives.filter(id => id !== courseId));
    } else if (maxElectives > 0 && selectedElectives.length < maxElectives) {
      setSelectedElectives([...selectedElectives, courseId]);
    }
  };

  const handleExcludeCoreCourse = (courseId: number) => {
    if (excludedCoreCourses.includes(courseId)) {
      setExcludedCoreCourses(excludedCoreCourses.filter(id => id !== courseId));
    } else {
      setExcludedCoreCourses([...excludedCoreCourses, courseId]);
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

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg break-words">Loading courses...</p>
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
              onClick={() => router.push(`/student/timetable/system/${systemType}`)}
              className="p-3 glass border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="p-5 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-2xl shadow-lg shadow-cyan-500/20">
              <Calendar className="w-10 h-10 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                System <span className="text-gradient">{systemType}</span>
                {termNumber && (
                  <> • Term <span className="text-gradient">{termNumber}</span></>
                )}
              </h1>
              <p className="text-gray-400 text-lg">Pick electives and preferences to generate a schedule you'll like.</p>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 sm:space-y-8 md:space-y-10"
        >
          {/* Core Courses Info */}
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
                  Core Courses ({coreCourses.length})
                </h2>
                <p className="text-gray-400">
                  All core courses will be automatically included in your schedule.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {coreCourses.map((course, idx) => {
                const isExcluded = excludedCoreCourses.includes(course.id);
                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.03 }}
                    className={`relative px-3 sm:px-4 md:px-5 py-3 sm:py-4 rounded-lg sm:rounded-xl text-white transition-all hover:shadow-lg hover:scale-105 min-h-[80px] ${
                      isExcluded
                        ? "bg-gradient-to-br from-red-500/20 to-orange-600/20 border border-red-500/50 opacity-60"
                        : "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/50 hover:from-cyan-500/30 hover:to-blue-600/30 hover:border-cyan-400/70 hover:shadow-cyan-500/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm sm:text-base mb-1 break-words">{course.code}</div>
                        <div className={`text-xs sm:text-sm break-words ${isExcluded ? "text-gray-300 line-through" : "text-gray-200"}`}>
                          {course.name}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleExcludeCoreCourse(course.id);
                        }}
                        className={`p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center ${
                          isExcluded
                            ? "bg-red-500/30 hover:bg-red-500/50 border border-red-500/50"
                            : "bg-white/10 hover:bg-red-500/30 hover:border-red-500/50 border border-transparent"
                        }`}
                        title={isExcluded ? "Include this course" : "Exclude this course from schedule"}
                        aria-label={isExcluded ? "Include this course" : "Exclude this course from schedule"}
                      >
                        <Trash2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isExcluded ? "text-red-300" : "text-gray-400"}`} />
                      </button>
                    </div>
                    {isExcluded && (
                      <div className="mt-2 text-xs text-red-300 font-semibold break-words">
                        Will be excluded from schedule
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            {excludedCoreCourses.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-base text-gray-400">
                  Excluded core courses: <span className="text-red-400 font-bold text-lg">{excludedCoreCourses.length}</span>
                </p>
                <p className="text-sm text-yellow-400 mt-2">
                  ⚠️ These courses will not appear in your generated schedules.
                </p>
              </div>
            )}
          </motion.div>

          {/* Elective Courses Selection */}
          {electiveCourses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
                <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-lg sm:rounded-xl shadow-lg shadow-purple-500/20 flex-shrink-0">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-7 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 break-words">
                    Elective Courses
                  </h2>
                  <p className="text-gray-400 text-sm sm:text-base break-words">
                    Choose up to {maxElectives} elective course{maxElectives > 1 ? 's' : ''} to include in your schedule.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                {electiveCourses.map((course, idx) => {
                  const isClosed = course.closedInAllClasses === true;
                  return (
                    <motion.div
                      key={course.id}
                      role="button"
                      tabIndex={0}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      onClick={() => {
                        if (isClosed) {
                          alert(`"${course.name}" (${course.code}) is closed for this term and cannot be selected.`);
                          return;
                        }
                        toggleElective(course.id, isClosed);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (isClosed) {
                            alert(`"${course.name}" (${course.code}) is closed for this term and cannot be selected.`);
                            return;
                          }
                          toggleElective(course.id, isClosed);
                        }
                      }}
                      className={`p-4 sm:p-5 md:p-6 glass border rounded-xl sm:rounded-2xl transition-all text-left min-h-[80px] sm:min-h-[100px] ${
                        isClosed
                          ? "border-gray-600 bg-gray-800/40 opacity-70 cursor-not-allowed hover:opacity-80"
                          : selectedElectives.includes(course.id)
                            ? "border-purple-500 bg-gradient-to-br from-purple-500/30 to-pink-600/30 shadow-xl shadow-purple-500/30 scale-105 cursor-pointer"
                            : "border-white/10 hover:border-purple-500/50 hover:bg-white/5 hover:scale-105 cursor-pointer"
                      } ${!isClosed && !selectedElectives.includes(course.id) && maxElectives > 0 && selectedElectives.length >= maxElectives ? "opacity-50 cursor-not-allowed hover:scale-100" : ""}`}
                      title={isClosed ? "Closed for this term – cannot select" : undefined}
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-base sm:text-lg md:text-xl mb-1 sm:mb-2 break-words ${isClosed ? "text-gray-400" : selectedElectives.includes(course.id) ? "text-purple-100" : "text-white"}`}>
                            {course.code}
                          </div>
                          <div className={`text-xs sm:text-sm break-words ${isClosed ? "text-gray-500" : selectedElectives.includes(course.id) ? "text-purple-200" : "text-gray-400"}`}>
                            {course.name}
                          </div>
                          {isClosed && (
                            <div className="mt-1.5 text-xs text-amber-400/90 font-medium flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" /> Closed for this term
                            </div>
                          )}
                        </div>
                        {!isClosed && selectedElectives.includes(course.id) && (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-purple-300 flex-shrink-0 ml-2 sm:ml-4" />
                        )}
                        {isClosed && (
                          <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 flex-shrink-0 ml-2 sm:ml-4" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {selectedElectives.length > 0 && (
                <div className="mt-4 sm:mt-6 md:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                  <p className="text-sm sm:text-base text-gray-400 break-words">
                    Selected: <span className="text-purple-400 font-bold text-base sm:text-lg">{selectedElectives.length}/{maxElectives}</span>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Excluded Days Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
              <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-br from-red-500/30 to-orange-600/30 rounded-lg sm:rounded-xl shadow-lg shadow-red-500/20 flex-shrink-0">
                <X className="w-5 h-5 sm:w-6 sm:h-7 text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 break-words">
                  Days to Exclude
                </h2>
                <p className="text-gray-400 text-sm sm:text-base break-words">
                  Select days you don't want to come to college. The system will try to minimize these days.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
              {DAYS.map((day, idx) => (
                <motion.button
                  key={day}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  onClick={() => toggleDay(day)}
                  className={`p-3 sm:p-4 md:p-5 lg:p-6 glass border rounded-lg sm:rounded-xl md:rounded-2xl transition-all min-h-[60px] sm:min-h-[80px] md:min-h-[100px] ${
                    excludedDays.includes(day)
                      ? "border-red-500 bg-gradient-to-br from-red-500/30 to-orange-600/30 shadow-xl shadow-red-500/30 scale-105"
                      : "border-white/10 hover:border-red-500/50 hover:bg-white/5 hover:scale-105"
                  }`}
                >
                  <div className={`font-bold text-sm sm:text-base md:text-lg mb-2 sm:mb-3 break-words ${excludedDays.includes(day) ? "text-red-100" : "text-white"}`}>
                    {day}
                  </div>
                  {excludedDays.includes(day) && (
                    <X className="w-4 h-4 sm:w-5 sm:h-6 md:w-6 md:h-6 text-red-300 mx-auto" />
                  )}
                </motion.button>
              ))}
            </div>
            {excludedDays.length > 0 && (
              <div className="mt-4 sm:mt-6 md:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                <p className="text-sm sm:text-base text-gray-400 break-words">
                  Excluding: <span className="text-red-400 font-bold text-base sm:text-lg">{excludedDays.length} day(s)</span>
                </p>
              </div>
            )}
          </motion.div>

          {/* Preferred Instructors Selection */}
          {instructors.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-lg shadow-lg shadow-green-500/20 flex-shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-6 md:w-7 md:h-7 text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 break-words">
                    Preferred Instructors (Optional)
                  </h2>
                  <p className="text-gray-400 text-sm sm:text-base break-words">
                    Select instructors you prefer. Schedules with more preferred instructors will rank higher.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {instructors.map((instructor, idx) => {
                  const isSelected = selectedInstructors.includes(instructor);
                  return (
                    <motion.button
                      key={instructor}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + idx * 0.015 }}
                      onClick={() => toggleInstructor(instructor)}
                      className={`group px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all text-left hover:-translate-y-0.5 min-h-[44px] ${
                        isSelected
                          ? "bg-green-400/10 border border-green-400/30 shadow-sm shadow-green-400/5"
                          : "bg-white/5 border border-white/10 hover:border-green-400/30 hover:bg-white/8 hover:shadow-sm hover:shadow-green-400/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs sm:text-sm font-medium break-words ${
                            isSelected ? "text-green-300" : "text-gray-300"
                          }`}>
                            {instructor}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              {selectedInstructors.length > 0 && (
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                  <p className="text-sm sm:text-base text-gray-400 break-words">
                    Selected: <span className="text-green-400 font-bold text-base sm:text-lg">{selectedInstructors.length}</span> instructor{selectedInstructors.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs sm:text-sm text-green-300/80 mt-1.5 break-words">
                    ✓ Schedules with these instructors will be prioritized
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-gray-500/30 to-gray-600/30 rounded-lg shadow-lg shadow-gray-500/20 flex-shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-6 md:w-7 md:h-7 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 break-words">
                    Preferred Instructors (Optional)
                  </h2>
                  <p className="text-gray-400 text-sm sm:text-base break-words">
                    No instructors found for courses in this term/system. Instructors will appear here once they are assigned to course sessions.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-5 pt-6"
          >
            <button
              onClick={() => router.push(`/student/timetable/system/${systemType}`)}
              className="px-8 py-4 glass border border-white/10 rounded-xl font-semibold text-white hover:border-gray-500/50 hover:bg-white/5 transition-all order-2 sm:order-1 text-lg"
            >
              Back
            </button>
            {allClassesTimetable && (
              <button
                onClick={() => router.push(`/student/timetable/system/${systemType}/${termToken}/all-classes`)}
                className="px-8 py-4 glass border border-white/10 rounded-xl font-semibold text-white hover:border-cyan-500/50 hover:bg-white/5 transition-all flex items-center justify-center gap-2 order-3 sm:order-2 text-lg"
              >
                <Calendar className="w-5 h-5" />
                View All Classes
              </button>
            )}
            <button
              onClick={handleGenerateSchedulesClick}
              disabled={loading}
              className="flex-1 px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 order-1 sm:order-3"
            >
              <Calendar className="w-6 h-6" />
              Generate Schedules
            </button>
          </motion.div>
        </motion.div>

        {/* Name modal before generating */}
        {showNameModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Generate Schedules</h3>
              <p className="text-gray-300 mb-4">Schedules will be generated now. Please enter your name.</p>
              <input
                type="text"
                value={studentNameInput}
                onChange={(e) => { setStudentNameInput(e.target.value); setNameModalError(null); }}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none mb-2"
                required
              />
              {nameModalError && <p className="text-red-400 text-sm mb-2">{nameModalError}</p>}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleNameModalCancel}
                  className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNameModalConfirm}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:scale-[1.02] transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
