"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  Loader2, 
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  TrendingUp,
  BookOpen,
  GraduationCap,
  ArrowLeft,
  LogOut
} from "lucide-react";
import Link from "next/link";
import { useAdminAuth } from "../../auth-check";

interface Term {
  id: number;
  term_number: string;
  is_published: boolean;
  systemTypes: number[];
}

interface Course {
  id: number;
  code: string;
  name: string;
  is_elective: boolean;
}

interface Template {
  id: number;
  term_id: number;
  term_number: string;
  system_type: number;
  elective_course_ids: number[] | null;
  schedule_count: number;
  access_count: number;
  last_accessed_at: string | null;
  createdAt: string;
}

export default function TemplatesManagementPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();

  // Step 1: System Selection
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null);
  
  // Step 2: Term Selection
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  
  // Step 2.5: Campus Track Selection (for Term 4 System 140 only)
  const [campusTrack, setCampusTrack] = useState<"northampton" | "normal" | null>(null);
  
  // Step 3: Course/Elective Selection
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedElectives, setSelectedElectives] = useState<number[]>([]);
  
  // Templates & State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  
  /**
   * Check if campus track selection is required for given term and system
   * Only Term 4 with System 140 requires NORTHAMPTON/Normal separation
   */
  const requiresCampusTrackSeparation = (termNumber: number | string, systemType: number): boolean => {
    const termNum = typeof termNumber === "string" ? parseInt(termNumber) : termNumber;
    return termNum === 4 && systemType === 140;
  };

  const systems = [
    { value: 140, label: "140", color: "from-blue-500 to-blue-600" },
    { value: 160, label: "160", color: "from-purple-500 to-purple-600" },
    { value: 180, label: "180", color: "from-cyan-500 to-cyan-600" },
  ];

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAllTemplates();
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (selectedSystem) {
      loadTermsForSystem(selectedSystem);
    }
  }, [selectedSystem]);

  useEffect(() => {
    if (selectedTerm) {
      loadCoursesForTerm(selectedTerm.id);
      
      // Reset campus track when term changes
      // Check if this term/system requires campus track selection
      if (selectedSystem && requiresCampusTrackSeparation(selectedTerm.term_number, selectedSystem)) {
        setCampusTrack("normal"); // Default to normal
      } else {
        setCampusTrack(null);
      }
    }
  }, [selectedTerm, selectedSystem]);

  const handleLogout = async () => {
    try {
      const { authAPI } = await import("@/lib/api/auth");
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      localStorage.clear();
    }
    router.push("/login");
  };

  const getToken = () => {
    return sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token");
  };

  const loadAllTemplates = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/timetable/admin/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load templates");

      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error: any) {
      console.error("Error loading templates:", error);
    }
  };

  const loadTermsForSystem = async (systemType: number) => {
    try {
      setLoading(true);
      const token = getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/timetable/terms`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load terms");

      const data = await response.json();
      
      const filteredTerms = (data.data || []).filter((term: Term) => 
        term.systemTypes && term.systemTypes.includes(systemType)
      );
      
      setTerms(filteredTerms);
      setSelectedTerm(null);
      setCourses([]);
      setSelectedElectives([]);
    } catch (error: any) {
      setMessage({ type: "error", text: `Error loading terms: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadCoursesForTerm = async (termId: number) => {
    try {
      setLoading(true);
      const token = getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/timetable/admin/terms/${termId}/courses?systemType=${selectedSystem}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to load courses");

      const data = await response.json();
      
      // Filter to only show elective courses
      const electiveCourses = (data.data || []).filter((course: Course) => course.is_elective);
      setCourses(electiveCourses);
      setSelectedElectives([]);
    } catch (error: any) {
      setMessage({ type: "error", text: `Error loading courses: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleElectiveToggle = (courseId: number) => {
    setSelectedElectives(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const generateTemplate = async () => {
    if (!selectedTerm || !selectedSystem) return;
    
    // Check if campus track is required but not selected
    const needsCampusTrack = requiresCampusTrackSeparation(selectedTerm.term_number, selectedSystem);
    if (needsCampusTrack && !campusTrack) {
      setMessage({
        type: "error",
        text: "❌ Term 4 System 140 requires campus track selection. Please choose NORTHAMPTON or Normal.",
      });
      return;
    }

    const electiveKey = selectedElectives.length > 0 
      ? selectedElectives.sort().join(",") 
      : "core-only";
    const trackKey = campusTrack ? `-${campusTrack}` : "";
    
    setGeneratingFor(`${electiveKey}${trackKey}`);
    setMessage(null);

    try {
      const token = getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/timetable/admin/templates/generate/${selectedTerm.id}`,
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemType: selectedSystem,
            electiveCourseIds: selectedElectives.length > 0 ? selectedElectives : null,
            campusTrack: campusTrack || undefined, // Include campus track for Term 4 System 140
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate template");
      }

      const data = await response.json();
      
      // Check if template already exists
      const campusTrackLabel = campusTrack ? ` (${campusTrack.toUpperCase()})` : "";
      if (data.already_exists) {
        setMessage({
          type: "info",
          text: `ℹ️ Template already exists! Term ${selectedTerm.term_number}, System ${selectedSystem}${campusTrackLabel}${selectedElectives.length > 0 ? ` with ${selectedElectives.length} elective(s)` : " (core-only)"} - ${data.template.schedule_count} schedules`,
        });
        setGeneratingFor(null);
        loadAllTemplates();
        return;
      }
      
      setMessage({
        type: "success",
        text: `✅ Template generation started! Creating template for Term ${selectedTerm.term_number}, System ${selectedSystem}${campusTrackLabel}${selectedElectives.length > 0 ? ` with ${selectedElectives.length} elective(s)` : " (core-only)"}. This runs in background (~1-2 min).`,
      });

      setTimeout(() => {
        loadAllTemplates();
        setGeneratingFor(null);
      }, 3000);

    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error.message}`,
      });
      setGeneratingFor(null);
    }
  };

  const invalidateTermTemplates = async (termId: number) => {
    if (!confirm("This will delete all templates for this term. Students will experience slower generation until templates are recreated. Continue?")) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/timetable/admin/templates/${termId}/invalidate`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to invalidate templates");

      const data = await response.json();
      setMessage({
        type: "success",
        text: `✅ Invalidated ${data.deleted_count} template(s)`,
      });
      
      loadAllTemplates();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error.message}`,
      });
    }
  };

  const deleteTemplate = async (templateId: number) => {
    if (!confirm("Delete this template?")) return;

    try {
      const token = getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/timetable/admin/templates/${templateId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to delete template");

      setMessage({ type: "success", text: "✅ Template deleted" });
      loadAllTemplates();
    } catch (error: any) {
      setMessage({ type: "error", text: `❌ Error: ${error.message}` });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Verifying authentication...</p>
        </div>
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
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
              <span className="text-gradient">Template</span> Management
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Generate pre-computed templates for 26-52x faster schedules
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
            <Link
              href="/admin/timetable"
              className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all flex items-center gap-2 group text-sm sm:text-base min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-semibold text-white hidden sm:inline">Back</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 glass border border-white/10 rounded-lg hover:border-red-500/50 transition-all flex items-center gap-2 group text-sm sm:text-base min-h-[44px]"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-semibold text-white hidden sm:inline">Logout</span>
            </button>
          </div>
        </motion.div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border text-sm sm:text-base break-words ${
                message.type === "success"
                  ? "bg-green-500/20 border-green-500 text-green-200"
                  : message.type === "error"
                  ? "bg-red-500/20 border-red-500 text-red-200"
                  : "bg-blue-500/20 border-blue-500 text-blue-200"
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Generation Wizard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: System Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-white/10 rounded-xl p-4 sm:p-6"
            >
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm sm:text-base font-bold flex-shrink-0">
                  1
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Select System</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {systems.map((system) => (
                  <button
                    key={system.value}
                    onClick={() => setSelectedSystem(system.value)}
                    className={`p-4 sm:p-6 rounded-lg border-2 transition-all min-h-[44px] ${
                      selectedSystem === system.value
                        ? `border-cyan-500 bg-gradient-to-r ${system.color} text-white shadow-lg shadow-cyan-500/50 scale-105`
                        : "border-white/10 glass hover:border-cyan-500/50"
                    }`}
                  >
                    <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 mb-2 mx-auto" />
                    <div className="font-bold text-lg sm:text-xl">{system.value}</div>
                    <div className="text-sm opacity-90">Credit Hours</div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Step 2: Term Selection */}
            {selectedSystem && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass border border-white/10 rounded-xl p-4 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm sm:text-base font-bold flex-shrink-0">
                    2
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Select Term</h2>
                </div>

                {loading && !selectedTerm ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : terms.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No published terms found for {selectedSystem} credit hours</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {terms.map((term) => (
                      <button
                        key={term.id}
                        onClick={() => setSelectedTerm(term)}
                        className={`p-4 rounded-lg border-2 transition-all min-h-[44px] ${
                          selectedTerm?.id === term.id
                            ? "border-purple-500 bg-purple-500/20 shadow-md scale-105"
                            : "border-white/10 glass hover:border-purple-500/50"
                        }`}
                      >
                        <div className="font-bold text-white">Term {term.term_number}</div>
                        <div className={`text-xs mt-1 ${term.is_published ? "text-green-400" : "text-yellow-400"}`}>
                          {term.is_published ? "Published" : "Draft"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2.5: Campus Track Selection (for Term 4 System 140 only) */}
            {selectedTerm && selectedSystem && requiresCampusTrackSeparation(selectedTerm.term_number, selectedSystem) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass border border-red-500/30 rounded-xl p-4 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-600 text-white text-sm sm:text-base font-bold flex-shrink-0">
                    !
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Select Campus Track</h2>
                    <p className="text-sm text-red-400">Required for Term 4 System 140</p>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                  This term has separate NORTHAMPTON and Normal classes. Select which track to generate templates for.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCampusTrack("northampton")}
                    className={`p-4 rounded-lg border-2 transition-all min-h-[60px] ${
                      campusTrack === "northampton"
                        ? "border-red-500 bg-red-500/20 shadow-md scale-105"
                        : "border-white/10 glass hover:border-red-500/50"
                    }`}
                  >
                    <div className="font-bold text-white mb-1">NORTHAMPTON</div>
                    <div className="text-xs text-gray-400">NORTHAMPTON ONLY classes</div>
                  </button>
                  <button
                    onClick={() => setCampusTrack("normal")}
                    className={`p-4 rounded-lg border-2 transition-all min-h-[60px] ${
                      campusTrack === "normal"
                        ? "border-cyan-500 bg-cyan-500/20 shadow-md scale-105"
                        : "border-white/10 glass hover:border-cyan-500/50"
                    }`}
                  >
                    <div className="font-bold text-white mb-1">Normal</div>
                    <div className="text-xs text-gray-400">Regular classes</div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Elective Selection */}
            {selectedTerm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass border border-white/10 rounded-xl p-4 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white text-sm sm:text-base font-bold flex-shrink-0">
                    3
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Select Electives</h2>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No elective courses found</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 mb-4">
                      Select electives or leave empty for core-only template
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {courses.map((course) => (
                        <label
                          key={course.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-white/10 glass hover:border-cyan-500/50 cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={selectedElectives.includes(course.id)}
                            onChange={() => handleElectiveToggle(course.id)}
                            className="w-5 h-5 rounded focus:ring-2 focus:ring-cyan-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white break-words">{course.code}</div>
                            <div className="text-sm text-gray-400 break-words">{course.name}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {/* Generate Button */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <button
                    onClick={generateTemplate}
                    disabled={!selectedTerm || generatingFor !== null}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/50 hover:shadow-xl text-base sm:text-lg font-bold min-h-[44px]"
                  >
                    {generatingFor ? (
                      <>
                        <div className="w-5 h-5 sm:w-6 sm:h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                        Generate Template
                      </>
                    )}
                  </button>
                  <p className="text-xs text-center text-gray-400 mt-2">
                    System {selectedSystem} • Term {selectedTerm?.term_number}
                    {campusTrack && ` • ${campusTrack.toUpperCase()}`}
                    {selectedElectives.length > 0 
                      ? ` • ${selectedElectives.length} elective${selectedElectives.length > 1 ? 's' : ''}`
                      : " • Core-only"
                    }
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Templates */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass border border-white/10 rounded-xl p-4 sm:p-6 sticky top-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Active Templates
                </h2>
                <button
                  onClick={loadAllTemplates}
                  className="p-2 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No templates yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {templates.map((template) => {
                    const electiveCount = template.elective_course_ids 
                      ? (typeof template.elective_course_ids === 'string' 
                          ? template.elective_course_ids.split(',').filter(Boolean).length 
                          : Array.isArray(template.elective_course_ids) 
                            ? template.elective_course_ids.length 
                            : 0)
                      : 0;
                    
                    return (
                      <div
                        key={template.id}
                        className="p-4 glass border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-white">
                              Term {template.term_number}
                            </div>
                            <div className="text-sm text-gray-400">
                              System {template.system_type}
                            </div>
                            {electiveCount > 0 && (
                              <div className="text-xs text-purple-400 mt-1">
                                {electiveCount} elective{electiveCount > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="p-1 glass border border-red-500/30 rounded hover:border-red-500 hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between text-gray-400">
                            <span>Schedules:</span>
                            <span className="font-medium text-green-400">
                              {template.schedule_count}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-gray-400">
                            <span>Uses:</span>
                            <span className="font-medium text-cyan-400">
                              {template.access_count}×
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {template.last_accessed_at
                            ? new Date(template.last_accessed_at).toLocaleDateString()
                            : "Never"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedTerm && (
                <button
                  onClick={() => invalidateTermTemplates(selectedTerm.id)}
                  className="w-full mt-4 px-4 py-2 glass border border-red-500/30 rounded-lg hover:border-red-500 hover:bg-red-500/20 transition-colors text-sm font-medium text-red-400 min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Clear Term {selectedTerm.term_number}
                </button>
              )}
            </motion.div>
          </div>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 glass border border-cyan-500/30 rounded-xl p-4 sm:p-6"
        >
          <h3 className="font-semibold text-cyan-400 mb-3 text-lg">💡 Performance Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <div className="font-semibold mb-2 text-green-400">✅ With Templates:</div>
              <ul className="space-y-1 ml-4 text-gray-400">
                <li>• 1-2 seconds generation time</li>
                <li>• 26-52x faster performance</li>
                <li>• 98% less database queries</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2 text-red-400">⚠️ Without Templates:</div>
              <ul className="space-y-1 ml-4 text-gray-400">
                <li>• 52 seconds wait time</li>
                <li>• High server load</li>
                <li>• Poor user experience</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
