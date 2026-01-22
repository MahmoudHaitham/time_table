"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  buttonText?: string;
}

export default function AlertModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  buttonText = "OK",
}: AlertModalProps) {
  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      iconBg: "bg-green-500/20",
      iconColor: "text-green-400",
      borderColor: "border-green-500/50",
    },
    error: {
      icon: XCircle,
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      borderColor: "border-red-500/50",
    },
    warning: {
      icon: AlertCircle,
      iconBg: "bg-yellow-500/20",
      iconColor: "text-yellow-400",
      borderColor: "border-yellow-500/50",
    },
    info: {
      icon: Info,
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/50",
    },
  };

  const { icon: Icon, iconBg, iconColor, borderColor } = config[type];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`glass backdrop-blur-xl border ${borderColor} rounded-2xl p-6 w-full max-w-md shadow-2xl`}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-3 ${iconBg} rounded-lg flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-gray-300">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all ${
              type === "success"
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/50"
                : type === "error"
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/50"
                : type === "warning"
                ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-yellow-500/50"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/50"
            }`}
          >
            {buttonText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
