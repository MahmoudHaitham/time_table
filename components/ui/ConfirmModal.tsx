"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Trash2, CheckCircle2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
  showIcon?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  isLoading = false,
  showIcon = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const config = {
    danger: {
      icon: Trash2,
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      borderColor: "border-red-500/50",
      buttonGradient: "from-red-500 to-red-600",
      buttonShadow: "shadow-red-500/50",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-yellow-500/20",
      iconColor: "text-yellow-400",
      borderColor: "border-yellow-500/50",
      buttonGradient: "from-yellow-500 to-orange-600",
      buttonShadow: "shadow-yellow-500/50",
    },
    info: {
      icon: CheckCircle2,
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/50",
      buttonGradient: "from-blue-500 to-indigo-600",
      buttonShadow: "shadow-blue-500/50",
    },
  };

  const { icon: Icon, iconBg, iconColor, borderColor, buttonGradient, buttonShadow } = config[type];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`glass backdrop-blur-xl border ${borderColor} rounded-2xl p-6 w-full max-w-md shadow-2xl`}
      >
        <div className="flex items-start gap-3 mb-4">
          {showIcon && (
            <div className={`p-3 ${iconBg} rounded-lg flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-gray-300">{message}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>
        <div className="flex gap-4 mt-6">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 bg-gradient-to-r ${buttonGradient} text-white rounded-lg font-semibold shadow-lg ${buttonShadow} hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                {showIcon && <Icon className="w-4 h-4" />}
                {confirmText}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 glass border border-white/10 rounded-lg font-semibold text-white hover:border-gray-500/50 transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
