"use client";

import { Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

const socialLinks = [
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/MahmoudHaitham",
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    href: "https://www.linkedin.com/in/mahmoud-haisam-756891287",
  },
  {
    name: "Email",
    icon: Mail,
    href: "mailto:mahmoudhaisam15@gmail.com",
  },
];

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold text-gradient mb-4">
              Mahmoud Haisam
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Computer Engineer • Teaching Assistant
              <br />
              Full-Stack & AI Developer
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {["Home", "About", "Skills", "Experience", "Projects", "Contact"].map(
                (link) => (
                  <li key={link}>
                    <Link
                      href={`#${link.toLowerCase()}`}
                      className="text-gray-600 dark:text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Connect With Me</h4>
            <div className="flex gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full glass glow-card hover:scale-110 transition-all"
                    aria-label={social.name}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} Mahmoud Haisam Mohammed. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

