"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { GraduationCap, Award, Languages, Sparkles } from "lucide-react";
import { educationData, languages } from "@/data/experience";

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="section-padding bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              About <span className="text-gradient">Me</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Computer Engineering graduate with a passion for innovation and continuous learning
            </p>
          </div>

          {/* Professional Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="glass-strong p-8 rounded-2xl relative overflow-hidden group"
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-600/5 group-hover:from-cyan-500/10 group-hover:via-blue-500/10 group-hover:to-purple-600/10 transition-all duration-500" />
            
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                <span className="group-hover:text-gradient-glow transition-all">Professional Summary</span>
              </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
              Computer Engineering graduate with a GPA of <strong>3.71/4.0</strong> (Excellent with Honor),
              possessing strong skills in software development, web applications, database design, and embedded systems.
              Experienced in problem-solving, data structures & algorithms, and project management.
              Currently serving as a <strong>Teaching Assistant at the Arab Academy for Science, Technology and 
              Maritime Transport (AASTMT), Faculty of Engineering, Computer Engineering Department</strong>, where I
              assist in teaching programming and computer engineering courses. Additionally, knowledgeable in
              networking and cybersecurity concepts with international training experience from the University of
              Central Lancashire (UCLan) in the UK.
            </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Education */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="glass-strong p-8 rounded-2xl glow-card-strong"
            >
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-cyan-400" />
                Education
              </h3>
              <div className="space-y-8">
                {educationData.map((edu) => (
                  <div key={edu.id} className="space-y-4">
                    <div>
                      <h4 className="text-xl font-semibold">{edu.degree}</h4>
                      <p className="text-cyan-400">{edu.institution}</p>
                      <p className="text-gray-600 dark:text-gray-400">{edu.location}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">{edu.period}</p>
                    </div>
                    <div className="space-y-2">
                      {edu.achievements.map((achievement, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Award className="w-4 h-4 text-cyan-400 mt-1 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Languages & Soft Skills */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="space-y-8"
            >
              {/* Languages */}
              <div className="glass-strong p-8 rounded-2xl glow-card-strong group">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Languages className="w-6 h-6 text-cyan-400 group-hover:rotate-12 transition-transform" />
                  Languages
                </h3>
                <div className="space-y-4">
                  {languages.map((lang) => (
                    <div key={lang.name} className="flex items-center justify-between group/item">
                      <span className="font-medium group-hover/item:text-gradient-glow transition-all">{lang.name}</span>
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-500/50 text-cyan-400 text-sm">
                        {lang.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Soft Skills */}
              <div className="glass-strong p-8 rounded-2xl glow-card-strong">
                <h3 className="text-2xl font-bold mb-6">Soft Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Leadership",
                    "Teamwork",
                    "Problem Solving",
                    "Adaptability",
                    "Communication",
                    "Time Management",
                  ].map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-sm font-medium border-2 border-cyan-500/40 hover:from-cyan-500/30 hover:to-blue-500/30 hover:scale-105 transition-all cursor-pointer"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

