"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  termsAPI,
  classesAPI,
  classCoursesAPI,
  electivesAPI,
  coursesAPI,
} from "@/lib/api/timetable";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, BookOpen, Users, FileCheck, Trash2, CheckCircle } from "lucide-react";
import AlertModal from "@/components/ui/AlertModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Term {
  id: number;
  term_number: string;
  is_published: boolean;
}

interface Class {
  id: number;
  class_code: string;
  term_id: number;
  system_type: number | null;
}

interface Course {
  id: number;
  code: string;
  name: string;
  is_elective: boolean;
}

export default function TermDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const termIdParam = params.id as string;
  const termId = termIdParam ? parseInt(termIdParam) : NaN;

  const [term, setTerm] = useState<Term | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"classes" | "electives" | "validation">("classes");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassNumber, setNewClassNumber] = useState("");
  const [newClassSystemType, setNewClassSystemType] = useState<number | null>(null);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [hasLab, setHasLab] = useState(false);
  const [isElective, setIsElective] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "danger",
    confirmText: "Confirm",
    cancelText: "Cancel",
  });

  useEffect(() => {
    // Auth is already handled by admin layout (useAdminAuth)
    // Validate termIdParam exists
    if (!termIdParam || termIdParam.trim() === "") {
      setError("Term ID is required");
      setLoading(false);
      return;
    }
    
    // Parse and validate termId - strict validation
    const parsedId = parseInt(termIdParam.trim(), 10);
    if (isNaN(parsedId) || parsedId <= 0 || !Number.isInteger(parsedId)) {
      setError(`Invalid term ID: "${termIdParam}"`);
      setLoading(false);
      return;
    }
    
    // Load data with valid termId
    loadTermData(parsedId);
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termIdParam]); // Removed router from dependencies to prevent multiple calls

  const loadTermData = async (idToLoad: number) => {
    console.log(`[loadTermData] Called with idToLoad:`, idToLoad, `type:`, typeof idToLoad);
    
    // Validate ID before making API calls
    if (!idToLoad || isNaN(idToLoad) || idToLoad <= 0 || !Number.isInteger(idToLoad)) {
      console.error(`[loadTermData] Invalid idToLoad:`, {
        idToLoad,
        type: typeof idToLoad,
        isNaN: isNaN(idToLoad),
        isPositive: idToLoad > 0,
        isInteger: Number.isInteger(idToLoad),
        stack: new Error().stack,
      });
      setError(`Invalid term ID: ${idToLoad}`);
      setLoading(false);
      return;
    }

    console.log(`[loadTermData] ID validated successfully:`, idToLoad);

    try {
      setLoading(true);
      setError(null);
      
      // Try to load term first
      let termRes;
      try {
        console.log(`[loadTermData] Calling termsAPI.getById with:`, idToLoad);
        termRes = await termsAPI.getById(idToLoad);
        console.log(`[loadTermData] Successfully loaded term:`, termRes);
      } catch (termErr: any) {
        console.error(`[loadTermData] Error loading term:`, {
          message: termErr.message,
          stack: termErr.stack,
          idToLoad,
          error: termErr,
        });
        
        if (termErr.message?.includes("401") || termErr.message?.includes("Authentication") || termErr.message?.includes("Admin access required")) {
          console.error(`[loadTermData] Authentication error, redirecting to login`);
          router.push("/login");
          return;
        }
        // Term not found or other error
        console.error(`[loadTermData] Setting error state:`, termErr.message);
        setError(termErr.message || "Term not found");
        setTerm(null);
        setLoading(false);
        return;
      }
      
      // Try to load classes
      let classesRes;
      try {
        console.log(`[loadTermData] Calling classesAPI.getByTerm with:`, idToLoad);
        classesRes = await classesAPI.getByTerm(idToLoad);
        console.log(`[loadTermData] Successfully loaded classes:`, classesRes);
      } catch (classErr: any) {
        // If classes fail to load, still show term but log error
        console.error(`[loadTermData] Failed to load classes:`, {
          message: classErr.message,
          stack: classErr.stack,
          idToLoad,
          error: classErr,
        });
        classesRes = { data: [] };
      }
      
      // Set the data
      if (termRes && termRes.data) {
        console.log(`[loadTermData] Setting term and classes data`);
        setTerm(termRes.data);
        
        // Sort classes: first by system_type (descending: 180, 160, 140, null), then by class_code numerically
        const sortedClasses = (classesRes.data || []).sort((a: Class, b: Class) => {
          // Sort by system_type first (descending: 180 > 160 > 140 > null)
          if (a.system_type !== b.system_type) {
            if (a.system_type === null) return 1;
            if (b.system_type === null) return -1;
            return b.system_type - a.system_type;
          }
          
          // Then sort by class_code numerically (extract number after underscore)
          const extractNumber = (code: string): number => {
            const parts = code.split("_");
            if (parts.length === 2) {
              const num = parseInt(parts[1], 10);
              return isNaN(num) ? 0 : num;
            }
            return 0;
          };
          
          const numA = extractNumber(a.class_code);
          const numB = extractNumber(b.class_code);
          
          if (numA !== numB) {
            return numA - numB;
          }
          
          // If numbers are equal, fall back to string comparison
          return a.class_code.localeCompare(b.class_code);
        });
        
        setClasses(sortedClasses);
      } else {
        console.error(`[loadTermData] Term data is invalid:`, { termRes });
        setError("Term data is invalid");
        setTerm(null);
      }
    } catch (err: any) {
      console.error(`[loadTermData] Unexpected error:`, {
        message: err.message,
        stack: err.stack,
        idToLoad,
        error: err,
      });
      
      if (err.message?.includes("401") || err.message?.includes("Authentication") || err.message?.includes("Admin access required")) {
        console.error(`[loadTermData] Authentication error in catch block, redirecting to login`);
        router.push("/login");
        return;
      }
      setError(err.message || "Failed to load term data");
      setTerm(null);
    } finally {
      console.log(`[loadTermData] Finally block - setting loading to false`);
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await coursesAPI.getAll();
      setCourses(response.data || []);
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get current termId from params - strict validation
    if (!termIdParam || termIdParam.trim() === "") {
      setError("Term ID is required");
      return;
    }
    const currentTermId = parseInt(termIdParam.trim(), 10);
    if (isNaN(currentTermId) || currentTermId <= 0 || !Number.isInteger(currentTermId)) {
      setError("Invalid term ID");
      return;
    }

    if (!term) {
      setError("Term not loaded");
      return;
    }

    try {
      // Auto-generate class code: TermNumber_ClassNumber (e.g., "4_1")
      const classCode = `${term.term_number}_${newClassNumber}`;
      await classesAPI.create(currentTermId, { 
        class_code: classCode,
        system_type: newClassSystemType || undefined,
      });
      setNewClassNumber("");
      setNewClassSystemType(null);
      setShowCreateClassModal(false);
      loadTermData(currentTermId);
    } catch (err: any) {
      setError(err.message || "Failed to create class");
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if course code already exists
    const courseCodeUpper = newCourseCode.trim().toUpperCase();
    const existingCourse = courses.find(
      c => c.code.trim().toUpperCase() === courseCodeUpper
    );
    
    if (existingCourse) {
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Course Code Already Exists",
        message: `Course code "${newCourseCode}" already exists! Please use a different code.`,
      });
      setError(`Course code "${newCourseCode}" already exists! Please use a different code.`);
      return;
    }
    
    // Store course code for success message
    const courseCodeToAdd = newCourseCode.trim();
    
    // Show success alert immediately (optimistic UI)
    setAlertModal({
      isOpen: true,
      type: "success",
      title: "Course Added Successfully!",
      message: `Course "${courseCodeToAdd}" has been added successfully!`,
    });
    
    // Close modal and reset form immediately
    setShowAddCourseModal(false);
    const courseNameToAdd = newCourseName.trim();
    const isElectiveToAdd = isElective;
    const hasLabToAdd = hasLab;
    
    setNewCourseCode("");
    setNewCourseName("");
    setHasLab(false);
    setIsElective(false);
    setError(null); // Clear any previous errors
    
    try {
      // Create course with components: L (always), S (always), LB (optional)
      await coursesAPI.create({
        code: courseCodeToAdd,
        name: courseNameToAdd,
        is_elective: isElectiveToAdd,
        components: ["L", "S", ...(hasLabToAdd ? ["LB"] : [])], // Always L and S, LB if checked
      });
      
      // Reload courses list
      loadCourses();
    } catch (err: any) {
      // Show error alert if API call failed (replaces success alert)
      const errorMessage = err.message?.includes("already exists") || err.message?.includes("unique constraint") || err.message?.includes("duplicate")
        ? `Course code "${courseCodeToAdd}" already exists! Please use a different code.`
        : err.message || "Failed to add course. Please try again.";
      
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Failed to Add Course",
        message: errorMessage,
      });
    }
  };

  const handleValidate = async () => {
    // Get current termId from params - strict validation
    if (!termIdParam || termIdParam.trim() === "") {
      setError("Term ID is required");
      return;
    }
    const currentTermId = parseInt(termIdParam.trim(), 10);
    if (isNaN(currentTermId) || currentTermId <= 0 || !Number.isInteger(currentTermId)) {
      setError("Invalid term ID");
      return;
    }

    try {
      const response = await termsAPI.validate(currentTermId);
      setValidationResult(response);
      setActiveTab("validation");
    } catch (err: any) {
      setError(err.message || "Failed to validate term");
    }
  };

  const handlePublish = async () => {
    // Get current termId from params - strict validation
    if (!termIdParam || termIdParam.trim() === "") {
      setError("Term ID is required");
      return;
    }
    const currentTermId = parseInt(termIdParam.trim(), 10);
    if (isNaN(currentTermId) || currentTermId <= 0 || !Number.isInteger(currentTermId)) {
      setError("Invalid term ID");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Publish Term",
      message: "Are you sure you want to publish this term? Students will be able to see and select courses from this term.",
      type: "info",
      confirmText: "Publish",
      cancelText: "Cancel",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await termsAPI.publish(currentTermId);
          setAlertModal({
            isOpen: true,
            type: "success",
            title: "Term Published!",
            message: "The term has been published successfully and is now visible to students.",
          });
          loadTermData(currentTermId);
        } catch (err: any) {
          setAlertModal({
            isOpen: true,
            type: "error",
            title: "Failed to Publish Term",
            message: err.message || "Failed to publish term. Please try again.",
          });
        }
      },
    });
  };

  const handleUnpublish = async () => {
    // Get current termId from params - strict validation
    if (!termIdParam || termIdParam.trim() === "") {
      setError("Term ID is required");
      return;
    }
    const currentTermId = parseInt(termIdParam.trim(), 10);
    if (isNaN(currentTermId) || currentTermId <= 0 || !Number.isInteger(currentTermId)) {
      setError("Invalid term ID");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Unpublish Term",
      message: "Are you sure you want to unpublish this term? Students will no longer be able to see or select courses from this term.",
      type: "warning",
      confirmText: "Unpublish",
      cancelText: "Cancel",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await termsAPI.unpublish(currentTermId);
          setAlertModal({
            isOpen: true,
            type: "success",
            title: "Term Unpublished!",
            message: "The term has been unpublished successfully and is no longer visible to students.",
          });
          loadTermData(currentTermId);
        } catch (err: any) {
          setAlertModal({
            isOpen: true,
            type: "error",
            title: "Failed to Unpublish Term",
            message: err.message || "Failed to unpublish term. Please try again.",
          });
        }
      },
    });
  };

  const handleDeleteClass = async (classId: number) => {
    // Get current termId from params - strict validation
    if (!termIdParam || termIdParam.trim() === "") {
      setError("Term ID is required");
      return;
    }
    const currentTermId = parseInt(termIdParam.trim(), 10);
    if (isNaN(currentTermId) || currentTermId <= 0 || !Number.isInteger(currentTermId)) {
      setError("Invalid term ID");
      return;
    }

    try {
      setDeletingClassId(classId);
      setError(null);
      await classesAPI.delete(classId);
      setShowDeleteConfirm(null);
      // Reload term data to refresh classes list
      loadTermData(currentTermId);
    } catch (err: any) {
      setError(err.message || "Failed to delete class");
    } finally {
      setDeletingClassId(null);
    }
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
          <p className="text-white text-xl">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!term && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-red-500/50 rounded-2xl p-8 max-w-md"
          >
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Term Not Found</h2>
            {error && (
              <p className="text-red-200 mb-4">{error}</p>
            )}
            <p className="text-gray-400 mb-6">
              The term with ID <span className="font-semibold text-white">{termIdParam}</span> does not exist or you don't have access to it.
            </p>
            <button
              onClick={() => router.push("/admin/timetable")}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl transition-all"
            >
              Back to Terms
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <button
            onClick={() => router.push("/admin/timetable")}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-3 sm:mb-4 transition-colors group min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base">Back to Terms</span>
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                <span className="text-gradient">{term.term_number}</span>
              </h1>
              <p className="text-gray-400 flex items-center gap-2 text-sm sm:text-base">
                Status:{" "}
                <span
                  className={`font-semibold flex items-center gap-2 ${
                    term.is_published ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  {term.is_published ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      Published
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Draft
                    </>
                  )}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
              <button
                onClick={handleValidate}
                className="px-6 py-3 glass border border-white/10 rounded-lg hover:border-blue-500/50 transition-all flex items-center gap-2 group"
              >
                <FileCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-white">Validate</span>
              </button>
              {!term.is_published ? (
                <button
                  onClick={handlePublish}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-green-500/50 hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Publish
                </button>
              ) : (
                <button
                  onClick={handleUnpublish}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg font-semibold shadow-lg shadow-yellow-500/50 hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Unpublish
                </button>
              )}
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

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 border-b border-white/10 overflow-x-auto pb-2">
          {[
            { id: "classes", label: "Classes", icon: Users },
            { id: "electives", label: "Electives", icon: BookOpen },
            { id: "validation", label: "Validation", icon: FileCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-semibold transition-all flex items-center gap-2 text-sm sm:text-base whitespace-nowrap min-h-[44px] ${
                  activeTab === tab.id
                    ? "text-cyan-400 border-b-2 border-cyan-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Classes Tab */}
        {activeTab === "classes" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Classes</h2>
              <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setShowAddCourseModal(true)}
                  className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 glass border border-white/10 rounded-lg hover:border-purple-500/50 transition-all flex items-center gap-2 group text-sm sm:text-base min-h-[44px] flex-1 sm:flex-initial"
                >
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="font-semibold text-white">Add Course</span>
                </button>
                <button
                  onClick={() => setShowCreateClassModal(true)}
                  className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl transition-all flex items-center gap-2 text-sm sm:text-base min-h-[44px] flex-1 sm:flex-initial"
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Create Class</span>
                  <span className="sm:hidden">Create</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {classes.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <div
                    onClick={() => router.push(`/admin/timetable/classes/${classItem.id}`)}
                    className="p-4 sm:p-5 md:p-6 glass border border-white/10 rounded-lg sm:rounded-xl hover:border-cyan-500/50 transition-all hover:scale-105 cursor-pointer pr-10 sm:pr-12 min-h-[120px]"
                  >
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-gradient transition-colors break-words">
                      {classItem.class_code}
                    </h3>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {classItem.system_type && (
                        <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-300 text-xs font-semibold whitespace-nowrap">
                          System {classItem.system_type}
                        </span>
                      )}
                      {!classItem.system_type && (
                        <span className="px-2 py-1 bg-gray-500/20 border border-gray-500/50 rounded text-gray-400 text-xs font-semibold whitespace-nowrap">
                          No System
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm">Click to manage timetable</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteConfirm(classItem.id);
                    }}
                    disabled={deletingClassId === classItem.id}
                    className="absolute top-4 right-4 p-2 glass border border-red-500/30 rounded-lg hover:border-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10 group/delete"
                    title="Delete class"
                  >
                    <Trash2 className="w-4 h-4 text-red-400 group-hover/delete:text-red-300 transition-colors" />
                  </button>
                </motion.div>
              ))}
            </div>

            {classes.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No classes found. Create your first class to get started.
              </div>
            )}
          </motion.div>
        )}

        {/* Electives Tab */}
        {activeTab === "electives" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Allowed Electives</h2>
            <p className="text-gray-400 mb-4">
              Select which elective courses are available for this term.
            </p>
            {(() => {
              // Parse and validate termId before rendering ElectivesManager
              if (!termIdParam) {
                return <div className="text-red-400">Term ID is required</div>;
              }
              const parsedTermId = parseInt(termIdParam.trim(), 10);
              if (isNaN(parsedTermId) || parsedTermId <= 0 || !Number.isInteger(parsedTermId)) {
                return <div className="text-red-400">Invalid term ID: {termIdParam}</div>;
              }
              return <ElectivesManager termId={parsedTermId} courses={courses} onAlert={(type, title, message) => setAlertModal({ isOpen: true, type, title, message })} />;
            })()}
          </motion.div>
        )}

        {/* Validation Tab */}
        {activeTab === "validation" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Validation Results</h2>
            {validationResult ? (
              <div>
                {validationResult.isValid ? (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="p-6 bg-green-500/20 border border-green-500 rounded-lg text-green-200 flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                      <div className="font-semibold text-lg">All validations passed!</div>
                      <div className="text-sm">The term is ready to publish.</div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 flex items-center gap-3"
                    >
                      <XCircle className="w-6 h-6" />
                      <div>
                        <div className="font-semibold">
                          Validation failed with {validationResult.errors?.length || 0} error(s)
                        </div>
                      </div>
                    </motion.div>
                    <div className="space-y-2">
                      {validationResult.errors?.map((err: any, idx: number) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 glass border border-white/10 rounded-lg"
                        >
                          <div className="font-semibold text-white flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            {err.type}
                          </div>
                          <div className="text-gray-300 mt-1">{err.message}</div>
                          {err.details && (
                            <div className="text-gray-400 text-sm mt-2 font-mono bg-black/20 p-2 rounded">
                              {JSON.stringify(err.details, null, 2)}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                Click "Validate" button to check term validity
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Add New Course</h2>
            <form onSubmit={handleAddCourse}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Course Code</label>
                <input
                  type="text"
                  value={newCourseCode}
                  onChange={(e) => {
                    setNewCourseCode(e.target.value);
                    // Clear error when user starts typing
                    if (error && error.includes("already exists")) {
                      setError(null);
                    }
                  }}
                  className={`w-full px-4 py-2 glass border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                    courses.some(c => c.code.trim().toUpperCase() === newCourseCode.trim().toUpperCase()) && newCourseCode.trim()
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-white/10 focus:border-cyan-500 focus:ring-cyan-500/20"
                  }`}
                  placeholder="e.g., CS101"
                  required
                />
                {courses.some(c => c.code.trim().toUpperCase() === newCourseCode.trim().toUpperCase()) && newCourseCode.trim() && (
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    This course code already exists!
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Course Name</label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="e.g., Introduction to Computer Science"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center p-3 glass border border-white/10 rounded-lg cursor-pointer hover:border-purple-500/50 transition-all mb-4">
                  <input
                    type="checkbox"
                    checked={isElective}
                    onChange={(e) => setIsElective(e.target.checked)}
                    className="mr-3 w-5 h-5 accent-purple-500"
                  />
                  <span className="text-white font-semibold">Is Elective</span>
                </label>
                <label className="block text-gray-300 mb-3">Components</label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 glass border border-white/10 rounded-lg cursor-not-allowed opacity-60">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="mr-3 w-5 h-5 accent-cyan-500"
                    />
                    <span className="text-white font-semibold">Lecture (L) - Required</span>
                  </label>
                  <label className="flex items-center p-3 glass border border-white/10 rounded-lg cursor-not-allowed opacity-60">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="mr-3 w-5 h-5 accent-cyan-500"
                    />
                    <span className="text-white font-semibold">Section (S) - Required</span>
                  </label>
                  <label className="flex items-center p-3 glass border border-white/10 rounded-lg cursor-pointer hover:border-cyan-500/50 transition-all">
                    <input
                      type="checkbox"
                      checked={hasLab}
                      onChange={(e) => setHasLab(e.target.checked)}
                      className="mr-3 w-5 h-5 accent-cyan-500"
                    />
                    <span className="text-white font-semibold">Lab (LB) - Optional</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl transition-all"
                >
                  Add Course
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCourseModal(false);
                    setNewCourseCode("");
                    setNewCourseName("");
                    setHasLab(false);
                    setIsElective(false);
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

      {/* Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Create New Class</h2>
            <form onSubmit={handleCreateClass}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Term</label>
                <input
                  type="text"
                  value={term?.term_number || ""}
                  disabled
                  className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-gray-400 bg-white/5 cursor-not-allowed"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Class Number</label>
                <input
                  type="text"
                  value={newClassNumber}
                  onChange={(e) => setNewClassNumber(e.target.value)}
                  className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="e.g., 1"
                  required
                />
                <p className="text-gray-400 text-sm mt-1">
                  Class will be created as: <span className="text-cyan-400 font-semibold">{term?.term_number}_{newClassNumber || "?"}</span>
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">System Type (Required)</label>
                <select
                  value={newClassSystemType || ""}
                  onChange={(e) => setNewClassSystemType(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all bg-black/20"
                  required
                >
                  <option value="" className="bg-gray-800">Select System Type</option>
                  <option value="180" className="bg-gray-800">180</option>
                  <option value="160" className="bg-gray-800">160</option>
                  <option value="140" className="bg-gray-800">140</option>
                </select>
                <p className="text-gray-400 text-sm mt-1">
                  Select the academic system for this class. You can create multiple classes with the same class number but different systems.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl transition-all"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateClassModal(false);
                    setNewClassNumber("");
                    setNewClassSystemType(null);
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

      {/* Delete Class Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Delete Class</h2>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete class{" "}
              <span className="font-semibold text-white">
                {classes.find((c) => c.id === showDeleteConfirm)?.class_code}
              </span>
              ? This action cannot be undone.
            </p>
            <p className="text-yellow-400 text-sm mb-6 font-semibold">
              ⚠️ Note: You can only delete classes that have no courses assigned. If this class has courses, please remove them first.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteClass(showDeleteConfirm)}
                disabled={deletingClassId === showDeleteConfirm}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold shadow-lg shadow-red-500/50 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingClassId === showDeleteConfirm ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(null);
                  setError(null);
                }}
                disabled={deletingClassId === showDeleteConfirm}
                className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all disabled:opacity-50"
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
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || "danger"}
        confirmText={confirmModal.confirmText || "Confirm"}
        cancelText={confirmModal.cancelText || "Cancel"}
      />
    </div>
  );
}

// Electives Manager Component
function ElectivesManager({ termId, courses, onAlert }: { termId: number; courses: Course[]; onAlert: (type: "success" | "error" | "warning" | "info", title: string, message: string) => void }) {
  const [selectedElectives, setSelectedElectives] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Validate termId before loading
    const isValidTermId = termId && !isNaN(termId) && termId > 0 && Number.isInteger(termId);
    if (isValidTermId) {
      loadElectives();
    } else {
      setLoading(false);
    }
  }, [termId]);

  const loadElectives = async () => {
    console.log(`[loadElectives] Called with termId:`, termId, `type:`, typeof termId);
    
    // Double-check termId is valid - strict validation
    if (!termId || isNaN(termId) || termId <= 0 || !Number.isInteger(termId)) {
      console.error(`[loadElectives] Invalid termId:`, {
        termId,
        type: typeof termId,
        isNaN: isNaN(termId),
        isPositive: termId > 0,
        isInteger: Number.isInteger(termId),
        stack: new Error().stack,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`[loadElectives] Calling electivesAPI.getByTerm with:`, termId);
      const response = await electivesAPI.getByTerm(termId);
      console.log(`[loadElectives] Successfully loaded electives:`, response);
      const electiveIds = (response.data || []).map((e: any) => e.course_id);
      setSelectedElectives(electiveIds);
    } catch (err: any) {
      console.error(`[loadElectives] Failed to load electives:`, {
        message: err.message,
        stack: err.stack,
        termId,
        error: err,
      });
      // Don't show error to user if it's just an invalid ID - component will handle it
      if (!err.message?.includes("Invalid term ID")) {
        // Only log other errors
      }
    } finally {
      console.log(`[loadElectives] Finally block - setting loading to false`);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate termId - strict validation
    if (!termId || isNaN(termId) || termId <= 0 || !Number.isInteger(termId)) {
      onAlert("error", "Invalid Term ID", "Invalid term ID. Please refresh the page and try again.");
      return;
    }

    try {
      setSaving(true);
      await electivesAPI.set(termId, selectedElectives);
      onAlert("success", "Electives Saved!", "Electives have been saved successfully!");
    } catch (err: any) {
      onAlert("error", "Failed to Save", err.message || "Failed to save electives");
    } finally {
      setSaving(false);
    }
  };

  const toggleElective = (courseId: number) => {
    setSelectedElectives((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const electiveCourses = courses.filter((c) => c.is_elective);

  if (loading) {
    return <div className="text-gray-400">Loading electives...</div>;
  }

  return (
    <div>
      <div className="space-y-2 mb-6">
        {electiveCourses.map((course, index) => (
          <motion.label
            key={course.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center p-4 glass border border-white/10 rounded-lg cursor-pointer hover:border-cyan-500/50 transition-all group"
          >
            <input
              type="checkbox"
              checked={selectedElectives.includes(course.id)}
              onChange={() => toggleElective(course.id)}
              className="mr-4 w-5 h-5 accent-cyan-500"
            />
            <div>
              <div className="font-semibold text-white group-hover:text-gradient transition-colors">
                {course.code}
              </div>
              <div className="text-gray-400 text-sm">{course.name}</div>
            </div>
          </motion.label>
        ))}
      </div>
      {electiveCourses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No elective courses found. Create courses and mark them as electives first.
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 disabled:bg-gray-600 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-xl transition-all disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "Save Electives"}
      </button>
    </div>
  );
}
