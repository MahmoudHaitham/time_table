"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Users,
  Clock,
  Filter,
  ArrowRight,
  Home,
  ExternalLink,
  Info,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function StudentManualPage() {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    // Detect current domain (works for both localhost and production)
    // Automatically adapts to: localhost:8000 or mahmoudhaisam.com
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      
      if (host === "localhost" || host === "127.0.0.1") {
        // Development: http://localhost:8000
        setBaseUrl(`${protocol}//${host}${port}`);
      } else {
        // Production: https://mahmoudhaisam.com (or any other domain)
        setBaseUrl(`${protocol}//${host}`);
      }
    }
  }, []);

  const getLink = (path: string) => {
    return `${baseUrl}${path}`;
  };

  const sections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: Home,
      color: "from-blue-500/30 to-cyan-600/30",
      iconColor: "text-blue-400",
    },
    {
      id: "public-timetable",
      title: "Public Timetable View",
      icon: Calendar,
      color: "from-teal-500/30 to-cyan-600/30",
      iconColor: "text-teal-400",
    },
    {
      id: "system-selection",
      title: "System Selection",
      icon: Filter,
      color: "from-cyan-500/30 to-blue-600/30",
      iconColor: "text-cyan-400",
    },
    {
      id: "preferences",
      title: "Setting Preferences",
      icon: CheckCircle2,
      color: "from-green-500/30 to-emerald-600/30",
      iconColor: "text-green-400",
    },
    {
      id: "schedules",
      title: "Viewing Schedules",
      icon: Clock,
      color: "from-purple-500/30 to-pink-600/30",
      iconColor: "text-purple-400",
    },
    {
      id: "other-section",
      title: "Other Section",
      icon: HelpCircle,
      color: "from-orange-500/30 to-red-600/30",
      iconColor: "text-orange-400",
    },
    {
      id: "electives",
      title: "Electives",
      icon: BookOpen,
      color: "from-indigo-500/30 to-purple-600/30",
      iconColor: "text-indigo-400",
    },
  ];

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-gradient-to-br from-blue-500/30 to-cyan-600/30 rounded-2xl shadow-lg shadow-blue-500/20">
              <BookOpen className="w-10 h-10 text-blue-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-5xl sm:text-6xl font-bold mb-3">
                Student <span className="text-gradient">Manual</span>
              </h1>
              <p className="text-gray-400 text-lg">
                Complete guide to using the Timetable Management System
              </p>
            </div>
            <button
              onClick={() => router.push("/student/timetable")}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-semibold shadow-xl shadow-blue-500/50 hover:shadow-blue-500/70 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Back to Timetable
            </button>
          </div>
        </motion.div>

        {/* Quick Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass border border-white/10 rounded-2xl p-8 mb-12 shadow-xl"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Info className="w-6 h-6 text-blue-400" />
            Quick Navigation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sections.map((section, idx) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="p-4 glass border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-white/5 transition-all flex items-center gap-3 group"
              >
                <section.icon className={`w-5 h-5 ${section.iconColor} group-hover:scale-110 transition-transform`} />
                <span className="text-white font-medium">{section.title}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </motion.div>

        {/* Getting Started */}
        <motion.section
          id="getting-started"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 bg-gradient-to-br ${sections[0].color} rounded-xl shadow-lg`}>
              <Home className={`w-7 h-7 ${sections[0].iconColor}`} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Getting Started</h2>
              <p className="text-gray-400">Learn how to access and navigate the timetable system</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-400" />
                Step 1: Access the Student Timetable
              </h3>
              <p className="text-gray-300 mb-4">
                Navigate to the Student Timetable section from the main menu or use this direct link:
              </p>
              <a
                href={getLink("/student/timetable")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                {getLink("/student/timetable")}
              </a>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-green-400" />
                What You Can Do
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>View Timetables:</strong> See your class schedules for any term</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Generate Custom Schedules:</strong> Create personalized schedules based on your preferences</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Select Electives:</strong> Choose elective courses and see all available slots</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Set Preferences:</strong> Exclude days, select preferred instructors, and more</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Public Timetable View */}
        <motion.section
          id="public-timetable"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 bg-gradient-to-br ${sections[1].color} rounded-xl shadow-lg`}>
              <Calendar className={`w-7 h-7 ${sections[1].iconColor}`} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Public Timetable View</h2>
              <p className="text-gray-400">Browse all published academic timetables</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-teal-400" />
                What is the Public Timetable Page?
              </h3>
              <p className="text-gray-300 mb-4">
                The Public Timetable page (<a href={getLink("/timetable")} className="text-teal-400 hover:underline">{getLink("/timetable")}</a>) is a public-facing page that displays all published academic timetables organized by system type. This page allows anyone to:
              </p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                  <span><strong>View Published Timetables:</strong> See all academic schedules that have been published by administrators</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                  <span><strong>Browse by System:</strong> Filter timetables by academic system (140, 160, or 180)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                  <span><strong>Access Term Details:</strong> Click on any term to view its complete timetable with all classes and schedules</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                  <span><strong>No Login Required:</strong> This page is publicly accessible - no authentication needed</span>
                </li>
              </ul>
              <a
                href={getLink("/timetable")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/20 border border-teal-500/50 rounded-lg text-teal-300 hover:bg-teal-500/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open Public Timetable Page
              </a>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-teal-400" />
                How to Use the Public Timetable Page
              </h3>
              <ol className="space-y-3 text-gray-300 list-decimal list-inside mb-4">
                <li>Navigate to the <a href={getLink("/timetable")} className="text-teal-400 hover:underline">Public Timetable</a> page</li>
                <li>You'll see three sections, one for each academic system (180, 160, 140)</li>
                <li>Each section displays all published terms for that system</li>
                <li>Each term card shows:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Term number (e.g., "Term 1", "Fall 2024")</li>
                    <li>Published status badge (green indicator)</li>
                    <li>System type badge</li>
                  </ul>
                </li>
                <li>Click on any term card to view its detailed timetable</li>
                <li>The detailed view shows all classes in that term with complete schedules</li>
              </ol>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Understanding the Layout</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">System Organization</h4>
                  <p className="text-gray-300 mb-3">
                    Timetables are organized into three main sections:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {[180, 160, 140].map((system) => (
                      <div
                        key={system}
                        className="p-4 bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border border-teal-500/30 rounded-lg"
                      >
                        <div className="text-2xl font-bold text-white mb-1">System {system}</div>
                        <div className="text-sm text-gray-300">
                          All published terms for System {system}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Term Cards</h4>
                  <p className="text-gray-300 mb-3">
                    Each term is displayed as a card with:
                  </p>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-teal-500/30 text-teal-300 rounded text-xs font-mono">Term Number</span>
                      <span>The academic term identifier (e.g., "Term 1", "Fall 2024")</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-green-500/30 text-green-300 rounded text-xs font-mono">Published Badge</span>
                      <span>Green indicator showing the term is publicly available</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-cyan-500/30 text-cyan-300 rounded text-xs font-mono">System Badge</span>
                      <span>The academic system this term belongs to</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Viewing Detailed Timetables</h3>
              <p className="text-gray-300 mb-4">
                When you click on a term card, you'll be taken to a detailed timetable page that shows:
              </p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                  <span><strong>All Classes:</strong> Every class in the selected term and system</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                  <span><strong>Complete Schedules:</strong> Full weekly schedules for each class</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                  <span><strong>Course Information:</strong> Course codes, component types (L, S, LB), rooms, and instructors</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                  <span><strong>Class Filtering:</strong> Option to view all classes or filter by specific class</span>
                </li>
              </ul>
              <div className="p-4 bg-teal-500/20 border border-teal-500/30 rounded-lg mt-4">
                <p className="text-teal-200 text-sm">
                  <Info className="w-4 h-4 inline mr-1" />
                  <strong>Note:</strong> The detailed timetable view shows the official published schedules. This is different from the student timetable generator, which creates personalized schedules based on your preferences.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Difference from Student Timetable</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Public Timetable Page</h4>
                  <ul className="space-y-1 text-gray-300 text-sm">
                    <li>• Shows official published schedules</li>
                    <li>• No customization or preferences</li>
                    <li>• View-only access</li>
                    <li>• Publicly accessible</li>
                    <li>• Shows all classes as assigned</li>
                  </ul>
                </div>
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Student Timetable Generator</h4>
                  <ul className="space-y-1 text-gray-300 text-sm">
                    <li>• Generates personalized schedules</li>
                    <li>• Customizable with preferences</li>
                    <li>• Select electives and set preferences</li>
                    <li>• Requires student access</li>
                    <li>• Creates multiple schedule options</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* System Selection */}
        <motion.section
          id="system-selection"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 bg-gradient-to-br ${sections[1].color} rounded-xl shadow-lg`}>
              <Filter className={`w-7 h-7 ${sections[1].iconColor}`} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">System Selection</h2>
              <p className="text-gray-400">Choose your academic system (140, 160, or 180)</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Understanding Academic Systems</h3>
              <p className="text-gray-300 mb-4">
                The system supports three academic systems. Select the one that matches your program:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {[180, 160, 140].map((system) => (
                  <div
                    key={system}
                    className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-lg"
                  >
                    <div className="text-3xl font-bold text-white mb-2">System {system}</div>
                    <div className="text-sm text-gray-300">
                      Academic system {system} courses and schedules
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-4">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Each system has its own set of courses and class schedules. Make sure to select the correct system.
              </p>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-cyan-400" />
                How to Select a System
              </h3>
              <ol className="space-y-3 text-gray-300 list-decimal list-inside">
                <li>Go to the <a href={getLink("/student/timetable")} className="text-cyan-400 hover:underline">Student Timetable</a> page</li>
                <li>Click on your academic system (140, 160, or 180)</li>
                <li>You will see all available terms for that system</li>
                <li>Select a term to view courses and generate schedules</li>
              </ol>
              <a
                href={getLink("/student/timetable")}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg text-cyan-300 hover:bg-cyan-500/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Go to System Selection
              </a>
            </div>
          </div>
        </motion.section>

        {/* Setting Preferences */}
        <motion.section
          id="preferences"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 bg-gradient-to-br ${sections[2].color} rounded-xl shadow-lg`}>
              <CheckCircle2 className={`w-7 h-7 ${sections[2].iconColor}`} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Setting Preferences</h2>
              <p className="text-gray-400">Customize your schedule generation with various preferences</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-400" />
                1. Excluded Days
              </h3>
              <p className="text-gray-300 mb-4">
                Select days you want to avoid having classes on. The system will prioritize schedules that don't use these days.
              </p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                  <span>Available days: <strong>Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                  <span>You can select multiple days to exclude</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                  <span>Schedules with fewer excluded days will rank higher</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                2. Elective Course Selection
              </h3>
              <p className="text-gray-300 mb-4">
                Select elective courses you want to include in your schedule. The maximum number of electives is determined dynamically based on your term and system.
              </p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
                  <span>The system shows the <strong>maximum number of electives</strong> you can select</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
                  <span>You can select fewer than the maximum if desired</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
                  <span>Only courses with scheduled sessions will appear in generated schedules</span>
                </li>
              </ul>
              <div className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg mt-4">
                <p className="text-purple-200 text-sm">
                  <Info className="w-4 h-4 inline mr-1" />
                  <strong>Tip:</strong> The maximum electives limit is calculated based on how many elective courses are assigned to classes in your term. This ensures fairness across all students.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                3. Preferred Instructors (Optional)
              </h3>
              <p className="text-gray-300 mb-4">
                Select instructors you prefer. Schedules with more preferred instructors will rank higher in the results.
              </p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                  <span>Only instructors for your selected courses (core + electives) are shown</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                  <span>You can select multiple preferred instructors</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                  <span>Schedules where preferred instructors teach multiple courses get higher scores</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                  <span>This is optional - you can skip it if you don't have preferences</span>
                </li>
              </ul>
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg mt-4">
                <p className="text-emerald-200 text-sm">
                  <Info className="w-4 h-4 inline mr-1" />
                  <strong>How it works:</strong> If you select an instructor and they teach 2 courses in a schedule, that schedule gets a significant score boost. The more courses they teach, the higher the score.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-400" />
                4. Excluding Core Courses (Optional)
              </h3>
              <p className="text-gray-300 mb-4">
                You can exclude specific core courses from your schedule if you're not taking them this term.
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                  <span>Click on core courses to exclude them</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                  <span>Excluded courses won't appear in generated schedules</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                  <span>Useful if you've already completed some courses or are retaking them</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Viewing Schedules */}
        <motion.section
          id="schedules"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 bg-gradient-to-br ${sections[3].color} rounded-xl shadow-lg`}>
              <Calendar className={`w-7 h-7 ${sections[3].iconColor}`} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Viewing Schedules</h2>
              <p className="text-gray-400">Understanding how schedules are generated and ranked</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Schedule Generation Process
              </h3>
              <p className="text-gray-300 mb-4">
                After setting your preferences, click "Generate Schedules" to create personalized timetable options.
              </p>
              <ol className="space-y-3 text-gray-300 list-decimal list-inside mb-4">
                <li>The system generates all possible combinations of your selected courses</li>
                <li>It filters out schedules with time conflicts</li>
                <li>Schedules are scored and ranked based on your preferences</li>
                <li>Top 50 schedules are displayed, sorted by score</li>
              </ol>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Schedule Ranking Criteria</h3>
              <p className="text-gray-300 mb-4">
                Schedules are ranked in this priority order:
              </p>
              <div className="space-y-3">
                {[
                  { priority: "1", title: "Fewer Excluded Days", desc: "Schedules that avoid your excluded days rank highest" },
                  { priority: "2", title: "No Lectures on Excluded Days", desc: "If excluded days are used, schedules without Lecture (L) sessions on those days rank higher" },
                  { priority: "3", title: "Fewer Slots on Excluded Days", desc: "Among schedules using excluded days, those with fewer slots rank higher" },
                  { priority: "4", title: "Preferred Instructors", desc: "Schedules with more preferred instructors (teaching multiple courses) rank higher" },
                  { priority: "5", title: "Fewer Total Days", desc: "Schedules that use fewer days per week rank higher" },
                  { priority: "6", title: "Fewer Gaps", desc: "Schedules with fewer time gaps between classes rank higher" },
                  { priority: "7", title: "Overall Score", desc: "Final ranking by calculated score" },
                ].map((item) => (
                  <div key={item.priority} className="flex gap-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center text-purple-300 font-bold">
                      {item.priority}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white mb-1">{item.title}</div>
                      <div className="text-sm text-gray-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Understanding Schedule Display</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Schedule Components</h4>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-red-500/30 text-red-300 rounded text-xs font-mono">L</span>
                      <span><strong>Lecture (L):</strong> Red background - Main lecture sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded text-xs font-mono">S</span>
                      <span><strong>Section (S):</strong> Blue background - Discussion/tutorial sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-purple-500/30 text-purple-300 rounded text-xs font-mono">LB</span>
                      <span><strong>Lab (LB):</strong> Purple background - Laboratory sessions</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Schedule Information</h4>
                  <ul className="space-y-2 text-gray-300">
                    <li><strong>Score:</strong> Higher scores indicate better schedules based on your preferences</li>
                    <li><strong>Total Days:</strong> Number of days per week with classes</li>
                    <li><strong>Gaps:</strong> Number of time gaps between consecutive classes</li>
                    <li><strong>Excluded Days Used:</strong> How many of your excluded days appear in this schedule</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Other Section */}
        <motion.section
          id="other-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 bg-gradient-to-br ${sections[4].color} rounded-xl shadow-lg`}>
              <HelpCircle className={`w-7 h-7 ${sections[4].iconColor}`} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Other Section</h2>
              <p className="text-gray-400">For students with special cases or flexible course selection</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">What is the "Other" Section?</h3>
              <p className="text-gray-300 mb-4">
                The "Other" section allows you to manually select courses from all available terms, regardless of your specific term assignment. This is useful for:
              </p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1" />
                  <span>Students who don't belong to a fixed academic term</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1" />
                  <span>Students taking courses from multiple terms</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1" />
                  <span>Special cases or custom course combinations</span>
                </li>
              </ul>
              <a
                href={getLink("/student/timetable/other")}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-300 hover:bg-orange-500/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open Other Section
              </a>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-orange-400" />
                How to Use the Other Section
              </h3>
              <ol className="space-y-3 text-gray-300 list-decimal list-inside mb-4">
                <li>Click on "Other" from the main timetable page</li>
                <li>Select your academic system (140, 160, or 180)</li>
                <li>Browse all available courses (core and elective) from all terms</li>
                <li>Select the courses you want to include in your schedule</li>
                <li>Set your preferences (excluded days, preferred instructors)</li>
                <li>Generate schedules with your custom course selection</li>
              </ol>
              <div className="p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg mt-4">
                <p className="text-orange-200 text-sm">
                  <Info className="w-4 h-4 inline mr-1" />
                  <strong>Note:</strong> Courses are deduplicated by course code, so each course appears only once even if it exists in multiple terms. The system will find the course across all terms when generating schedules.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Preferred Instructors in Other Section</h3>
              <p className="text-gray-300 mb-4">
                Just like in the regular system selection, you can select preferred instructors in the Other section:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1" />
                  <span>Instructors appear automatically when you select courses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1" />
                  <span>Only instructors for your selected courses are shown</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1" />
                  <span>The instructor list updates dynamically as you select/deselect courses</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Electives Section */}
        <motion.section
          id="electives"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 bg-gradient-to-br ${sections[5].color} rounded-xl shadow-lg`}>
              <BookOpen className={`w-7 h-7 ${sections[5].iconColor}`} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Electives</h2>
              <p className="text-gray-400">View all available elective course slots across all terms</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">What is the Electives Section?</h3>
              <p className="text-gray-300 mb-4">
                The Electives section provides a comprehensive view of all elective course slots available across all terms for your selected system. This helps you:
              </p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-1" />
                  <span>Browse all elective courses and their scheduled time slots</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-1" />
                  <span>See which classes offer which elective courses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-1" />
                  <span>Plan your elective selections before generating schedules</span>
                </li>
              </ul>
              <a
                href={getLink("/student/timetable/electives")}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 rounded-lg text-indigo-300 hover:bg-indigo-500/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                View Electives
              </a>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">How to Use the Electives Section</h3>
              <ol className="space-y-3 text-gray-300 list-decimal list-inside">
                <li>Click on "Electives" from the main timetable page</li>
                <li>Select your academic system (140, 160, or 180)</li>
                <li>Browse all elective courses organized by term</li>
                <li>View scheduled slots for each elective course</li>
                <li>Use this information to make informed elective selections when generating schedules</li>
              </ol>
            </div>
          </div>
        </motion.section>

        {/* Tips and Best Practices */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-yellow-500/30 to-orange-600/30 rounded-xl shadow-lg">
              <Info className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Tips & Best Practices</h2>
              <p className="text-gray-400">Get the most out of the timetable system</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                Optimal Preferences
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Select 1-2 excluded days for best results</li>
                <li>• Too many excluded days may limit schedule options</li>
                <li>• Preferred instructors work best when they teach multiple courses</li>
              </ul>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                Generation Time
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Schedule generation takes 5-30 seconds</li>
                <li>• Complex preferences may take longer</li>
                <li>• Be patient - the system is finding the best options</li>
              </ul>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Filter className="w-5 h-5 text-yellow-400" />
                Course Selection
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Only courses with scheduled sessions appear in results</li>
                <li>• Check the Electives section before selecting</li>
                <li>• Maximum electives is dynamic per term</li>
              </ul>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Troubleshooting
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• No schedules? Try reducing excluded days</li>
                <li>• Can't select electives? Check the maximum limit</li>
                <li>• Instructors not showing? Make sure courses are selected first</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Quick Links */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="glass border border-white/10 rounded-2xl p-10 sm:p-12 shadow-xl"
        >
          <h2 className="text-3xl font-bold text-white mb-8">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Public Timetable", path: "/timetable", desc: "View all published timetables" },
              { name: "Student Timetable", path: "/student/timetable", desc: "Main timetable page" },
              { name: "Electives", path: "/student/timetable/electives", desc: "View all elective slots" },
              { name: "Other Section", path: "/student/timetable/other", desc: "Custom course selection" },
            ].map((link) => (
              <a
                key={link.path}
                href={getLink(link.path)}
                className="p-6 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">{link.name}</h3>
                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <p className="text-sm text-gray-400 mb-2">{link.desc}</p>
                <p className="text-xs text-gray-500 font-mono break-all">{getLink(link.path)}</p>
              </a>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center text-gray-400 text-sm"
        >
          <p>Need help? Contact your system administrator or refer to this manual.</p>
          <p className="mt-2">
            Timetable Management System - Student Guide v1.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}
