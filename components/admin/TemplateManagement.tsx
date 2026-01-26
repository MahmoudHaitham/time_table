/**
 * Schedule Template Management Component
 * Add this to your admin term details page
 * Location: app/admin/timetable/terms/[id]/page.tsx
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Trash2, RefreshCw, Eye, Clock, TrendingUp } from "lucide-react";

interface TemplateManagementProps {
  termId: number;
}

export function TemplateManagement({ termId }: TemplateManagementProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /**
   * Pre-generate templates for this term
   * This should be run after creating/updating timetable data
   */
  const handlePreGenerate = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/timetable/admin/templates/generate/${termId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start template generation");
      }

      const data = await response.json();
      
      setMessage({
        type: "success",
        text: `✅ Template generation started! Creating templates for systems: ${data.system_types?.join(", ")}. This runs in the background and takes ~1-2 minutes.`,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Invalidate all templates for this term
   * Use this after modifying timetable data (sessions, classes)
   */
  const handleInvalidate = async () => {
    if (!confirm("This will delete all cached templates for this term. Students will experience slower generation on their next request (templates will be recreated). Continue?")) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/timetable/admin/templates/${termId}/invalidate`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to invalidate templates");
      }

      const data = await response.json();
      
      setMessage({
        type: "success",
        text: `✅ Invalidated ${data.deleted_count} template(s). New templates will be created when students generate schedules.`,
      });
      
      // Refresh templates list if showing
      if (showTemplates) {
        handleViewTemplates();
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * View all templates for this term
   */
  const handleViewTemplates = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/timetable/admin/templates`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load templates");
      }

      const data = await response.json();
      
      // Filter templates for this term
      const termTemplates = data.data.filter((t: any) => t.term_id === termId);
      setTemplates(termTemplates);
      setShowTemplates(true);
      
      if (termTemplates.length === 0) {
        setMessage({
          type: "error",
          text: "⚠️ No templates found for this term. Click 'Pre-generate Templates' to create them.",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-6 h-6 text-yellow-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            ⚡ Schedule Templates (Performance Optimization)
          </h2>
          <p className="text-sm text-gray-600">
            Pre-generate templates to make schedule generation 26-52x faster for students
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-800 mb-2">📊 How Templates Work:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Without templates:</strong> Students wait 52 seconds for schedule generation</li>
          <li>• <strong>With templates:</strong> Students get results in 1-2 seconds (26-52x faster!)</li>
          <li>• <strong>When to use:</strong> Pre-generate after creating/updating timetable data</li>
          <li>• <strong>When to invalidate:</strong> After modifying sessions, classes, or courses</li>
        </ul>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg mb-4 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Pre-generate Button */}
        <button
          onClick={handlePreGenerate}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          <Zap className="w-5 h-5" />
          <span className="font-medium">Pre-generate Templates</span>
        </button>

        {/* View Templates Button */}
        <button
          onClick={handleViewTemplates}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          <Eye className="w-5 h-5" />
          <span className="font-medium">View Templates</span>
        </button>

        {/* Invalidate Button */}
        <button
          onClick={handleInvalidate}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          <Trash2 className="w-5 h-5" />
          <span className="font-medium">Invalidate Templates</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-2" />
          <span className="text-gray-600">Processing...</span>
        </div>
      )}

      {/* Templates List */}
      {showTemplates && templates.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t pt-4"
        >
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Active Templates ({templates.length})
          </h3>
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">System Type</div>
                    <div className="font-semibold text-gray-800">
                      {template.system_type} Credit Hours
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Electives</div>
                    <div className="font-semibold text-gray-800">
                      {template.elective_course_ids
                        ? JSON.parse(template.elective_course_ids).length + " courses"
                        : "Core only"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Schedules</div>
                    <div className="font-semibold text-green-600">
                      {template.schedule_count} cached
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Usage</div>
                    <div className="font-semibold text-blue-600 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {template.access_count} times
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Last used:{" "}
                  {template.last_accessed_at
                    ? new Date(template.last_accessed_at).toLocaleString()
                    : "Never"}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Usage Instructions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">📖 Usage Guide:</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>
            <strong>After creating timetable:</strong> Click "Pre-generate Templates" to create
            cached schedules for all system types
          </li>
          <li>
            <strong>After updating sessions/classes:</strong> Click "Invalidate Templates" to clear
            old cache
          </li>
          <li>
            <strong>Monitor usage:</strong> Click "View Templates" to see which templates are most
            used
          </li>
          <li>
            <strong>Performance:</strong> Students will experience 1-2 second generation times
            instead of 52 seconds!
          </li>
        </ol>
      </div>
    </motion.div>
  );
}
