"use client";

import { motion } from "framer-motion";
import { Github, Linkedin, Mail, MapPin, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background matching other sections */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/25 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.25, 0.4, 0.25],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/25 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/25 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <div className="space-y-16">
          
          {/* Professional Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Open to opportunities
              </span>
            </div>

            {/* Name - Clean and professional */}
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
              Mahmoud Haisam Mohammed
            </h1>

            {/* Title - Clear hierarchy */}
            <p className="text-2xl md:text-3xl text-gray-400 font-light">
              Computer Engineer & Full-Stack Developer
            </p>

            {/* Location & Role */}
            <div className="flex flex-wrap items-center gap-6 text-gray-500">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Alexandria, Egypt</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="text-sm">Teaching Assistant at AASTMT</span>
              </div>
            </div>
          </motion.div>

          {/* Professional Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl"
          >
            <p className="text-lg text-gray-400 leading-relaxed">
              Experienced software engineer specializing in full-stack development, AI/ML solutions, 
              and system architecture. Proven track record of delivering scalable applications using 
              modern technologies including React, Node.js, and Python.
            </p>
          </motion.div>

          {/* Expertise Areas - Professional grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid md:grid-cols-4 gap-4"
          >
            {[
              { title: "Full-Stack Development", desc: "React, Next.js, Node.js" },
              { title: "AI & Machine Learning", desc: "Python, TensorFlow, PyTorch" },
              { title: "Database Design", desc: "PostgreSQL, MySQL, Redis" },
              { title: "Cloud & DevOps", desc: "AWS, Docker, CI/CD" },
            ].map((area, i) => (
              <motion.div
                key={area.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                whileHover={{ y: -4, borderColor: "rgba(6, 182, 212, 0.5)" }}
                className="p-5 border border-gray-800 hover:bg-gray-900/50 transition-all rounded-lg"
              >
                <h3 className="text-white font-semibold mb-2 text-sm">{area.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{area.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Key Metrics - Professional cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {[
              { value: "3.71", label: "GPA", sublabel: "Excellent with Honor" },
              { value: "18+", label: "Projects", sublabel: "Delivered" },
              { value: "42", label: "Technologies", sublabel: "Mastered" },
              { value: "5+", label: "Years", sublabel: "Experience" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + i * 0.1 }}
                whileHover={{ y: -4, borderColor: "rgba(6, 182, 212, 0.5)" }}
                className="p-6 border border-gray-800 hover:bg-gray-900/50 transition-all rounded-lg text-center"
              >
                <div className="text-4xl font-bold text-cyan-400 mb-2">{stat.value}</div>
                <div className="text-white text-sm font-semibold mb-1">{stat.label}</div>
                <div className="text-gray-600 text-xs">{stat.sublabel}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Beautiful floating social icons with glow effects */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="flex items-center justify-center gap-6 pt-8"
          >
            {[
              { 
                icon: Github, 
                href: "https://github.com/MahmoudHaitham", 
                label: "GitHub",
                color: "from-gray-400 to-gray-600",
                glow: "rgba(156, 163, 175, 0.5)"
              },
              { 
                icon: Linkedin, 
                href: "https://www.linkedin.com/in/mahmoud-haisam-756891287", 
                label: "LinkedIn",
                color: "from-blue-400 to-blue-600",
                glow: "rgba(59, 130, 246, 0.5)"
              },
              { 
                icon: Mail, 
                href: "mailto:mahmoudhaisam15@gmail.com", 
                label: "Email",
                color: "from-cyan-400 to-cyan-600",
                glow: "rgba(6, 182, 212, 0.5)"
              },
            ].map((social, i) => (
              <motion.div
                key={social.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.9 + i * 0.1 }}
                className="relative"
              >
                <motion.a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.2, rotate: 360, y: -8 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative group block"
                  aria-label={social.label}
                >
                  {/* Main icon container with gradient */}
                  <div className={`relative p-5 rounded-2xl bg-gradient-to-br ${social.color} shadow-lg group-hover:shadow-2xl transition-all`}>
                    <social.icon className="w-6 h-6 text-white relative z-10" />
                    
                    {/* Pulsing glow effect */}
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        boxShadow: `0 0 20px ${social.glow}, 0 0 40px ${social.glow}`,
                      }}
                    />
                  </div>

                  {/* Massive blur glow on hover */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1.5 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 rounded-2xl blur-2xl -z-10"
                    style={{
                      background: `radial-gradient(circle, ${social.glow}, transparent)`,
                    }}
                  />
                </motion.a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
