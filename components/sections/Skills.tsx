"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { skillsData, categories } from "@/data/skills";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Skills() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeTab, setActiveTab] = useState("programming");

  return (
    <section id="skills" className="section-padding relative overflow-hidden">
      {/* Simple animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-blue-500/5 to-purple-500/5" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Professional Header */}
          <div className="text-center space-y-3 sm:space-y-4 px-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              className="inline-block"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                  Skills & Expertise
                </span>
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base md:text-lg text-gray-400 max-w-2xl mx-auto"
            >
              A comprehensive overview of technologies and frameworks I work with
            </motion.p>
          </div>

          {/* Stunning Tabs */}
          <TooltipProvider>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 }}
                className="mb-12"
              >
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 h-auto p-2 sm:p-3 bg-transparent border-0 overflow-x-auto">
                  {categories.map((category, idx) => {
                    const CategoryIcon = category.icon;
                    const isActive = activeTab === category.id;
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                        animate={isInView ? { opacity: 1, scale: 1, rotateY: 0 } : {}}
                        transition={{ delay: 0.4 + idx * 0.05, type: "spring" }}
                        whileHover={{ scale: 1.05, y: -5 }}
                      >
                        <TabsTrigger
                          value={category.id}
                          className={`
                            w-full h-full flex flex-col items-center gap-2 px-6 py-4
                            glass-strong rounded-xl relative overflow-hidden group
                            transition-all duration-300
                            ${isActive ? 'border-2 border-cyan-400 bg-cyan-400/10' : 'border border-gray-700/50 hover:border-gray-600'}
                          `}
                        >
                          {/* Icon */}
                          <div className={`p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-transform ${isActive ? 'scale-110 border-cyan-400/50' : 'group-hover:scale-110 group-hover:border-white/20'}`}>
                            <CategoryIcon className="w-6 h-6 text-white" />
                          </div>

                          {/* Label */}
                          <span className={`
                            relative z-10 text-sm font-semibold transition-colors
                            ${isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'}
                          `}>
                            {category.name}
                          </span>
                        </TabsTrigger>
                      </motion.div>
                    );
                  })}
                </TabsList>
              </motion.div>

              {/* Tab Contents with STUNNING Cards */}
              {categories.map((category) => (
                <TabsContent key={category.id} value={category.id} className="mt-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                  >
                    {skillsData
                      .filter((skill) => skill.category === category.id)
                      .map((skill, idx) => {
                        const SkillIcon = skill.Icon;
                        return (
                          <HoverCard key={skill.name} openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, rotateY: -180 }}
                                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                transition={{ delay: idx * 0.03, type: "spring", stiffness: 200 }}
                                whileHover={{ 
                                  scale: 1.08, 
                                  y: -10,
                                  rotateY: 5,
                                  rotateX: 5,
                                }}
                                className="cursor-pointer group"
                                style={{ transformStyle: "preserve-3d" }}
                                key={`skill-${skill.name}-v2`}
                              >
                                <div className="glass-strong p-6 rounded-2xl h-full relative overflow-hidden border-2 border-transparent hover:border-cyan-400/50 transition-all duration-300">
                          {/* Animated gradient background - simplified */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${skill.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                                  
                          {/* Simple rotating light beam */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className={`absolute inset-0 bg-gradient-to-r ${skill.color} opacity-20 blur-xl`} 
                              style={{ clipPath: "polygon(50% 50%, 0% 0%, 100% 0%)" }} 
                            />
                          </div>

                                  <div className="relative z-10 space-y-4">
                                    {/* Icon - white color */}
                                    <div className="relative">
                                      <div className="w-20 h-20 rounded-2xl bg-gray-800/50 backdrop-blur-sm p-4 shadow-2xl mx-auto flex items-center justify-center group-hover:shadow-cyan-500/50 transition-all border border-gray-700/50 group-hover:border-cyan-400/50">
                                        <SkillIcon className="w-full h-full text-white" />
                                      </div>
                                      {/* Simple pulsing glow */}
                                      <div className="absolute inset-0 rounded-2xl bg-cyan-400/20 blur-xl opacity-0 group-hover:opacity-70 transition-opacity" />
                                    </div>

                                    {/* Name */}
                                    <h3 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300">
                                      {skill.name}
                                    </h3>

                                    {/* Experience badge - white text */}
                                    <div className="flex justify-center">
                                      <span className="px-4 py-2 rounded-full text-xs font-bold bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 text-white shadow-lg">
                                        {skill.experience}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Corner glows */}
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </motion.div>
                            </HoverCardTrigger>
                            
                            {/* Rich HoverCard */}
                            <HoverCardContent className="w-80 p-6 glass-strong border border-cyan-400/30">
                              <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                  <div className="p-4 rounded-2xl bg-gray-800/50 backdrop-blur-sm shadow-2xl border border-gray-700/50">
                                    <SkillIcon className="w-8 h-8 text-white" />
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-bold text-gradient">{skill.name}</h4>
                                    <p className="text-sm text-cyan-400 font-semibold">{skill.category}</p>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                  {skill.description}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {skill.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${skill.color} text-white`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <div className="pt-3 border-t border-cyan-400/30">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-cyan-400">Experience:</span>
                                    <span className="text-sm text-gray-400">{skill.experience}</span>
                                  </div>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </TooltipProvider>
        </motion.div>
      </div>
    </section>
  );
}
