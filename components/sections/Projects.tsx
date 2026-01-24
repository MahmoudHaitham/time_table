"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Github, ExternalLink, Folder } from "lucide-react";
import { projectsData, projectCategories } from "@/data/projects";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export default function Projects() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredProjects = activeFilter === "All"
    ? projectsData
    : projectsData.filter((project) => project.category === activeFilter);

  return (
    <section id="projects" className="section-padding">
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
              Featured <span className="text-gradient">Projects</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A showcase of my work spanning web applications, AI/ML, and embedded systems
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4">
            {projectCategories.map((category, idx) => (
              <motion.button
                key={category}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setActiveFilter(category)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all min-h-[44px] flex items-center justify-center ${
                  activeFilter === category
                    ? "animated-gradient text-white shadow-lg shadow-cyan-500/50 scale-105"
                    : "glass-strong glow-card hover:scale-105"
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>

          {/* Projects Grid with HoverCards */}
          <motion.div
            layout
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project, idx) => (
              <HoverCard key={project.id} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-strong p-6 rounded-2xl glow-card-strong hover:scale-105 transition-all group relative overflow-hidden cursor-pointer"
                  >
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-purple-600/0 group-hover:from-cyan-500/5 group-hover:via-blue-500/5 group-hover:to-purple-600/5 transition-all duration-500 rounded-2xl" />
                    
                    <div className="relative z-10">
                      {/* Project Icon/Category */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-500/30 group-hover:scale-110 transition-transform">
                          <Folder className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                        </div>
                        <div className="flex gap-2">
                          {project.github && (
                            <a
                              href={project.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-lg glass-strong hover:bg-cyan-500/30 transition-all hover:scale-110"
                            >
                              <Github className="w-5 h-5" />
                            </a>
                          )}
                          {project.demo && (
                            <a
                              href={project.demo}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-lg glass-strong hover:bg-cyan-500/30 transition-all hover:scale-110"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Project Title */}
                      <h3 className="text-xl font-bold mb-2 group-hover:text-gradient-glow transition-all">
                        {project.title}
                      </h3>
                      
                      {/* Short Description */}
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {project.description}
                      </p>

                      {/* Tech Stack Preview */}
                      <div className="flex flex-wrap gap-2">
                        {project.stack.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          >
                            {tech}
                          </span>
                        ))}
                        {project.stack.length > 3 && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            +{project.stack.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </HoverCardTrigger>

                {/* HoverCard Content - Detailed View */}
                <HoverCardContent className="w-96 p-6 glass-strong border border-cyan-400/30" side="top">
                  <div className="space-y-4">
                    {/* Header with Icon */}
                    <div className="flex items-start gap-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30">
                        <Folder className="w-8 h-8 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-gradient mb-1">{project.title}</h4>
                        <p className="text-sm text-cyan-400 font-semibold">{project.category}</p>
                      </div>
                    </div>

                    {/* Full Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {project.description}
                    </p>

                    {/* All Features */}
                    <div>
                      <h5 className="text-sm font-semibold text-white mb-2">Key Features:</h5>
                      <div className="space-y-2">
                        {project.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 mt-2" />
                            <span className="text-xs text-gray-400">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Full Tech Stack */}
                    <div>
                      <h5 className="text-sm font-semibold text-white mb-2">Technologies:</h5>
                      <div className="flex flex-wrap gap-2">
                        {project.stack.map((tech) => (
                          <span
                            key={tech}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="flex gap-3 pt-2">
                      {project.github && (
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white text-sm font-medium transition-all hover:scale-105"
                        >
                          <Github className="w-4 h-4" />
                          View Code
                        </a>
                      )}
                      {project.demo && (
                        <a
                          href={project.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-medium transition-all hover:scale-105"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
