"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { studentTimetableAPI } from "@/lib/api/timetable";
import { Calendar, BookOpen, X, CheckCircle2, Trash2, ArrowLeft } from "lucide-react";

interface Course {
  id: number;
  code: string;
  name: string;
  is_elective: boolean;
  component_types?: string;
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

  useEffect(() => {
    if (termToken && systemType) {
      loadCourses();
    }
  }, [termToken, systemType]);

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

      // Store term number and token if available
      if (timetableRes.data?.term?.term_number) {
        sessionStorage.setItem(`term_number_${termToken}`, timetableRes.data.term.term_number);
        sessionStorage.setItem(`term_token_${termToken}`, termToken);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedules = async () => {
    if (!termToken || !systemType) return;
    
    if (maxElectives > 0 && selectedElectives.length > maxElectives) {
      setError(`Maximum ${maxElectives} elective course${maxElectives > 1 ? 's' : ''} allowed`);
      return;
    }

    // Store preferences in sessionStorage for the schedules page (using token as key)
    sessionStorage.setItem(`timetable_preferences_${termToken}`, JSON.stringify({
      excludedDays,
      electiveCourseIds: selectedElectives.length > 0 ? selectedElectives : undefined,
      excludedCoreCourseIds: excludedCoreCourses.length > 0 ? excludedCoreCourses : undefined,
      systemType,
    }));

    router.push(`/student/timetable/system/${systemType}/${termToken}/schedules`);
  };

  const toggleDay = (day: string) => {
    if (excludedDays.includes(day)) {
      setExcludedDays(excludedDays.filter(d => d !== day));
    } else {
      setExcludedDays([...excludedDays, day]);
    }
  };

  const toggleElective = (courseId: number) => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 sm:p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading courses...</p>
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
                System <span className="text-gradient">{systemType}</span> - Select Preferences
              </h1>
              <p className="text-gray-400 text-lg">Configure your schedule preferences</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coreCourses.map((course, idx) => {
                const isExcluded = excludedCoreCourses.includes(course.id);
                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.03 }}
                    className={`relative px-5 py-4 rounded-xl text-white transition-all hover:shadow-lg hover:scale-105 ${
                      isExcluded
                        ? "bg-gradient-to-br from-red-500/20 to-orange-600/20 border border-red-500/50 opacity-60"
                        : "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/50 hover:from-cyan-500/30 hover:to-blue-600/30 hover:border-cyan-400/70 hover:shadow-cyan-500/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-bold text-base mb-1">{course.code}</div>
                        <div className={`text-sm ${isExcluded ? "text-gray-300 line-through" : "text-gray-200"}`}>
                          {course.name}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleExcludeCoreCourse(course.id);
                        }}
                        className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                          isExcluded
                            ? "bg-red-500/30 hover:bg-red-500/50 border border-red-500/50"
                            : "bg-white/10 hover:bg-red-500/30 hover:border-red-500/50 border border-transparent"
                        }`}
                        title={isExcluded ? "Include this course" : "Exclude this course from schedule"}
                      >
                        <Trash2 className={`w-4 h-4 ${isExcluded ? "text-red-300" : "text-gray-400"}`} />
                      </button>
                    </div>
                    {isExcluded && (
                      <div className="mt-2 text-xs text-red-300 font-semibold">
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
              className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-xl shadow-lg shadow-purple-500/20">
                  <BookOpen className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Elective Courses
                  </h2>
                  <p className="text-gray-400">
                    Select up to {maxElectives} elective course{maxElectives > 1 ? 's' : ''} to include in your schedule.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {electiveCourses.map((course, idx) => (
                  <motion.button
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    onClick={() => toggleElective(course.id)}
                    disabled={!selectedElectives.includes(course.id) && maxElectives > 0 && selectedElectives.length >= maxElectives}
                    className={`p-6 glass border rounded-2xl transition-all text-left ${
                      selectedElectives.includes(course.id)
                        ? "border-purple-500 bg-gradient-to-br from-purple-500/30 to-pink-600/30 shadow-xl shadow-purple-500/30 scale-105"
                        : "border-white/10 hover:border-purple-500/50 hover:bg-white/5 hover:scale-105"
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className={`font-bold text-xl mb-2 ${selectedElectives.includes(course.id) ? "text-purple-100" : "text-white"}`}>
                          {course.code}
                        </div>
                        <div className={`text-sm ${selectedElectives.includes(course.id) ? "text-purple-200" : "text-gray-400"}`}>
                          {course.name}
                        </div>
                      </div>
                      {selectedElectives.includes(course.id) && (
                        <CheckCircle2 className="w-7 h-7 text-purple-300 flex-shrink-0 ml-4" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
              {selectedElectives.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-base text-gray-400">
                    Selected: <span className="text-purple-400 font-bold text-lg">{selectedElectives.length}/{maxElectives}</span>
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
              onClick={handleGenerateSchedules}
              disabled={loading}
              className="flex-1 px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 order-1 sm:order-3"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Schedules...
                </>
              ) : (
                <>
                  <Calendar className="w-6 h-6" />
                  Generate Schedules
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
