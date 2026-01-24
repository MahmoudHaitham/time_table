"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Briefcase, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { experienceData } from "@/data/experience";

export default function Experience() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="experience" className="section-padding bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Section Header */}
          <div className="text-center space-y-3 sm:space-y-4 px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
              Work <span className="text-gradient">Experience</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Professional journey and contributions to the tech industry
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 to-purple-600 shadow-[0_0_10px_rgba(0,240,255,0.5)]" />

            <div className="space-y-12">
              {experienceData.map((exp, idx) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: idx * 0.2, duration: 0.6 }}
                  className={`relative flex items-center ${
                    idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  } flex-col`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-8 md:left-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-4 border-white dark:border-gray-900 transform -translate-x-1/2 z-10 shadow-[0_0_20px_rgba(0,240,255,0.8)] animate-pulse" />

                  {/* Content card */}
                  <div className={`w-full md:w-[calc(50%-2rem)] lg:w-[calc(50%-3rem)] ml-12 sm:ml-16 md:ml-0 ${idx % 2 === 0 ? "md:pr-6 lg:pr-12" : "md:pl-6 lg:pl-12"}`}>
                    <motion.div 
                      whileHover={{ scale: 1.08, y: -10, rotateY: 5, rotateX: 5 }}
                      transition={{ type: "spring", stiffness: 200, damping: 10 }}
                      className="glass-strong p-6 rounded-2xl glow-card-strong relative overflow-hidden group cursor-pointer"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {/* Rotating Light Beam */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-purple-600/0 group-hover:from-cyan-500/10 group-hover:via-blue-500/10 group-hover:to-purple-600/10 transition-all duration-500" />
                      
                      {/* Pulsing glow on hover */}
                      <motion.div
                        className="absolute inset-0 bg-cyan-400 blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-2xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 group-hover:from-cyan-400 group-hover:to-blue-500 transition-all duration-300">{exp.title}</h3>
                            <p className="text-cyan-400 font-medium group-hover:text-cyan-300 transition-colors">{exp.company}</p>
                          </div>
                          <motion.span 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-500/50 text-cyan-400 text-sm font-medium group-hover:from-cyan-500/50 group-hover:to-blue-500/50 group-hover:border-cyan-400 transition-all"
                          >
                            {exp.type}
                          </motion.span>
                        </div>

                      <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {exp.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {exp.period}
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {exp.description}
                      </p>

                      <div className="space-y-2 mb-4">
                        {exp.responsibilities.map((resp, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-1 flex-shrink-0" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {resp}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {exp.skills.map((skill) => (
                          <motion.span
                            key={skill}
                            whileHover={{ scale: 1.1, y: -3 }}
                            className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-sm hover:from-cyan-500/40 hover:to-blue-500/40 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/50 transition-all cursor-pointer"
                          >
                            {skill}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

