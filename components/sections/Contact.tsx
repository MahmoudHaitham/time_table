"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Mail, MapPin, Send, CheckCircle2, AlertCircle, Github, Linkedin, Sparkles } from "lucide-react";

export default function Contact() {
  const ref = useRef(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Using Web3Forms - free and reliable email service
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_key: "a98b391d-9bdb-4a0e-833b-d0570b3c3a0b",
          name: formData.name,
          email: formData.email,
          message: formData.message,
          subject: `New Portfolio Contact from ${formData.name}`,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setFormData({ name: "", email: "", message: "" });

        setTimeout(() => {
          setIsSubmitted(false);
        }, 5000);
      } else {
        throw new Error("Failed to send");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      setError("Oops! Something went wrong. Please email me directly at mahmoudhaisam15@gmail.com");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section id="contact" className="section-padding relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(6,182,212,0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, rgba(139,92,246,0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 80%, rgba(59,130,246,0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(6,182,212,0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Section Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              className="flex items-center justify-center gap-3"
            >
              <Sparkles className="w-8 h-8 text-cyan-400" />
              <h2 className="text-5xl md:text-6xl font-black">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                  Let's Connect
                </span>
              </h2>
              <Sparkles className="w-8 h-8 text-purple-400" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-400 max-w-2xl mx-auto"
            >
              Have a project in mind or want to collaborate? Let's make something amazing together!
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-6"
            >
              {/* Contact Cards */}
              <div className="space-y-4">
                {[
                  {
                    icon: Mail,
                    label: "Email",
                    value: "mahmoudhaisam15@gmail.com",
                    href: "mailto:mahmoudhaisam15@gmail.com",
                    color: "from-cyan-500 to-cyan-600",
                  },
                  {
                    icon: MapPin,
                    label: "Location",
                    value: "Alexandria, Egypt",
                    href: null,
                    color: "from-blue-500 to-blue-600",
                  },
                ].map((contact, i) => (
                  <motion.div
                    key={contact.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    whileHover={{ scale: 1.03, x: 10 }}
                    className="glass-strong p-6 rounded-xl group cursor-pointer relative overflow-hidden border border-gray-700/50 hover:border-cyan-400/50 transition-all"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${contact.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`p-4 rounded-xl bg-gradient-to-br ${contact.color} shadow-lg group-hover:shadow-xl transition-all`}>
                        <contact.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-300 mb-1">{contact.label}</h4>
                        {contact.href ? (
                          <a
                            href={contact.href}
                            className="text-gray-400 hover:text-cyan-400 transition-colors"
                          >
                            {contact.value}
                          </a>
                        ) : (
                          <p className="text-gray-400">{contact.value}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Social Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.7 }}
                className="glass-strong p-6 rounded-xl border border-gray-700/50"
              >
                <h4 className="font-semibold text-lg mb-4 text-gray-300">Connect with Me</h4>
                <div className="flex gap-4">
                  {[
                    { icon: Github, href: "https://github.com/MahmoudHaitham", label: "GitHub", color: "from-gray-700 to-gray-900" },
                    { icon: Linkedin, href: "https://www.linkedin.com/in/mahmoud-haisam-756891287", label: "LinkedIn", color: "from-blue-500 to-blue-700" },
                    { icon: Mail, href: "mailto:mahmoudhaisam15@gmail.com", label: "Email", color: "from-cyan-500 to-cyan-700" },
                  ].map((social, i) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.2, y: -5 }}
                      whileTap={{ scale: 0.9 }}
                      className="group relative flex-1"
                    >
                      <div className={`p-5 rounded-xl bg-gradient-to-br ${social.color} shadow-xl group-hover:shadow-2xl group-hover:shadow-cyan-400/30 transition-all relative overflow-hidden`}>
                        <social.icon className="w-6 h-6 text-white relative z-10 mx-auto" />
                        {/* Shimmer on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      </div>
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              {/* Availability */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.8 }}
                className="glass-strong p-6 rounded-xl border border-gray-700/50"
              >
                <h4 className="font-semibold text-lg mb-4 text-gray-300">Available For</h4>
                <div className="space-y-3">
                  {[
                    "Full-Stack Development Projects",
                    "AI/ML Consulting & Development",
                    "Teaching & Technical Mentoring",
                    "Freelance & Contract Work",
                  ].map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.9 + i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-400">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Enhanced Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <form 
                ref={formRef} 
                onSubmit={handleSubmit} 
                className="glass-strong p-8 rounded-2xl space-y-6 relative overflow-hidden group border border-gray-700/50 hover:border-cyan-400/30 transition-all"
              >
                {/* Animated background glow */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{
                    background: [
                      "linear-gradient(to bottom right, rgba(6,182,212,0.05), rgba(59,130,246,0.05), rgba(139,92,246,0.05))",
                      "linear-gradient(to bottom right, rgba(139,92,246,0.05), rgba(6,182,212,0.05), rgba(59,130,246,0.05))",
                      "linear-gradient(to bottom right, rgba(6,182,212,0.05), rgba(59,130,246,0.05), rgba(139,92,246,0.05))",
                    ],
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                />

                <div className="relative z-10 space-y-6">
                  {/* Name Input */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.5 }}
                  >
                    <label htmlFor="name" className="block text-sm font-semibold mb-2 text-gray-300">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-4 rounded-xl bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                    />
                  </motion.div>

                  {/* Email Input */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.6 }}
                  >
                    <label htmlFor="email" className="block text-sm font-semibold mb-2 text-gray-300">
                      Your Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-4 rounded-xl bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                    />
                  </motion.div>

                  {/* Message Textarea */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.7 }}
                  >
                    <label htmlFor="message" className="block text-sm font-semibold mb-2 text-gray-300">
                      Your Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-5 py-4 rounded-xl bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all resize-none text-white placeholder:text-gray-500"
                    />
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.8 }}
                  >
                    <motion.button
                      type="submit"
                      disabled={isSubmitting || isSubmitted}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-8 py-5 rounded-xl relative overflow-hidden font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {/* Animated gradient background */}
                      <motion.div
                        animate={{
                          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 bg-[length:200%_auto]"
                      />
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                      {/* Button content */}
                      <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                        {isSubmitted ? (
                          <>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1, rotate: 360 }}
                              transition={{ type: "spring", stiffness: 200 }}
                            >
                              <CheckCircle2 className="w-6 h-6" />
                            </motion.div>
                            <span>Message Sent Successfully!</span>
                          </>
                        ) : isSubmitting ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Send className="w-6 h-6" />
                            </motion.div>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            <span>Send Message</span>
                          </>
                        )}
                      </div>
                    </motion.button>
                  </motion.div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/30"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {/* Success Message */}
                  {isSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 text-green-400 text-sm bg-green-500/10 p-4 rounded-xl border border-green-500/30"
                    >
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <span>Thank you! I'll get back to you soon.</span>
                    </motion.div>
                  )}

                  {/* Note */}
                  <p className="text-xs text-gray-500 text-center">
                    Your message is sent securely via Web3Forms. I typically respond within 24 hours.
                  </p>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Bottom Social Links - Large */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1 }}
            className="flex justify-center gap-6 mt-12"
          >
            {[
              { icon: Github, href: "https://github.com/MahmoudHaitham", label: "GitHub", gradient: "from-gray-700 to-gray-900" },
              { icon: Linkedin, href: "https://www.linkedin.com/in/mahmoud-haisam-756891287", label: "LinkedIn", gradient: "from-blue-500 to-blue-700" },
              { icon: Mail, href: "mailto:mahmoudhaisam15@gmail.com", label: "Email", gradient: "from-cyan-500 to-cyan-700" },
            ].map((social, i) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.2, rotate: 5, y: -10 }}
                whileTap={{ scale: 0.9 }}
                className="group relative"
              >
                <div className={`p-6 rounded-2xl bg-gradient-to-br ${social.gradient} shadow-2xl group-hover:shadow-cyan-500/50 transition-all relative overflow-hidden`}>
                  <social.icon className="w-8 h-8 text-white relative z-10" />
                  {/* Shimmer on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-cyan-400/40 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-10 scale-150" />
              </motion.a>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
