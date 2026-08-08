"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { problemsAPI } from "@/lib/api/timetable";
import { AlertCircle, ArrowLeft, Send, ChevronDown } from "lucide-react";

export default function ProblemPage() {
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [northampton, setNorthampton] = useState<"yes" | "no" | "">("");
  const [northamptonOpen, setNorthamptonOpen] = useState(false);
  const northamptonRef = useRef<HTMLDivElement>(null);
  const TERM_OPTIONS = ["4", "5", "6", "7", "8", "9", "10", "other"] as const;
  const [term, setTerm] = useState<string>("");
  const [termOpen, setTermOpen] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (northamptonRef.current && !northamptonRef.current.contains(e.target as Node)) {
        setNorthamptonOpen(false);
      }
      if (termRef.current && !termRef.current.contains(e.target as Node)) {
        setTermOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedName.includes(" ")) {
      setError("Please enter both first and last name (at least one space).");
      return;
    }
    const regNum = registrationNumber.trim();
    if (!regNum) {
      setError("Registration number is required.");
      return;
    }
    if (!/^\d{8}$|^\d{9}$/.test(regNum)) {
      setError("Registration number must be exactly 8 or 9 digits only.");
      return;
    }
    if (northampton !== "yes" && northampton !== "no") {
      setError("Please select Northampton: Yes or No.");
      return;
    }
    if (!term || !TERM_OPTIONS.includes(term as typeof TERM_OPTIONS[number])) {
      setError("Please select Term (4, 5, 6, 7, 8, 9, 10, or Other).");
      return;
    }
    if (!description.trim()) {
      setError("Full description of problem is required.");
      return;
    }

    try {
      setLoading(true);
      setSuccessMessage(null);
      await problemsAPI.submit({
        name: trimmedName,
        registration_number: regNum,
        northampton,
        term,
        description: description.trim(),
      });
      setSuccessMessage("Your problem report has been submitted. We will address it as soon as possible (first-come, first-served).");
      setName("");
      setRegistrationNumber("");
      setNorthampton("");
      setTerm("");
      setDescription("");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <Link
            href="/student/timetable"
            className="p-3 glass border border-white/10 rounded-xl hover:border-cyan-500/50 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </Link>
          <div className="p-4 bg-gradient-to-br from-red-900/40 to-red-800/30 rounded-xl shadow-lg border border-red-500/30">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Report a <span className="text-red-400">Problem</span>
            </h1>
            <p className="text-gray-400 mt-1">Submit your name, registration number, and a full description. We will respond in order received.</p>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-xl text-red-200 text-sm sm:text-base"
          >
            {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-xl text-green-200 text-sm sm:text-base"
          >
            {successMessage}
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="border-2 border-red-900 rounded-2xl p-6 sm:p-8 shadow-xl bg-red-950/90"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-white font-medium mb-2 text-sm sm:text-base">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-white font-medium mb-2 text-sm sm:text-base">Registration number</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={registrationNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                  setRegistrationNumber(v);
                }}
                placeholder="8 or 9 digits only"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                maxLength={9}
              />
            </div>
            <div ref={northamptonRef}>
              <label className="block text-white font-medium mb-2 text-sm sm:text-base">Northampton</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNorthamptonOpen(!northamptonOpen)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 flex items-center justify-between"
                >
                  <span className={northampton ? "text-white" : "text-gray-500"}>
                    {northampton === "yes" ? "Yes" : northampton === "no" ? "No" : "Select Yes or No"}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${northamptonOpen ? "rotate-180" : ""}`} />
                </button>
                {northamptonOpen && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-white/10 overflow-hidden bg-gray-900 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setNorthampton("yes");
                        setNorthamptonOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 focus:bg-white/10 focus:outline-none border-b border-white/5"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNorthampton("no");
                        setNorthamptonOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div ref={termRef}>
              <label className="block text-white font-medium mb-2 text-sm sm:text-base">Term</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTermOpen(!termOpen)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 flex items-center justify-between"
                >
                  <span className={term ? "text-white" : "text-gray-500"}>
                    {term ? (term === "other" ? "Other" : `Term ${term}`) : "Select term (4–10 or Other)"}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${termOpen ? "rotate-180" : ""}`} />
                </button>
                {termOpen && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-white/10 overflow-hidden bg-gray-900 shadow-xl max-h-56 overflow-y-auto">
                    {TERM_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTerm(t);
                          setTermOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 focus:bg-white/10 focus:outline-none border-b border-white/5 last:border-b-0"
                      >
                        {t === "other" ? "Other" : `Term ${t}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-white font-medium mb-2 text-sm sm:text-base">Full description of problem</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your problem in detail. You can write in English or Arabic."
                rows={6}
                dir="auto"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-y min-h-[140px]"
              />
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-500/50 hover:from-red-500 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Submit Report
            </button>
            <Link
              href="/student/timetable"
              className="px-6 py-3 rounded-xl font-medium border border-white/10 text-gray-300 hover:border-cyan-500/50 hover:bg-white/5 transition-all text-center"
            >
              Cancel
            </Link>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
