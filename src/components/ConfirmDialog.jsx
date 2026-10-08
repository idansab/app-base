import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  variant = 'warning',
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = false,
}) {
  if (!isOpen) return null;

  const bgColorMap = {
    danger: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  };

  const buttonColorMap = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />

      <motion.div
        className="fixed top-1/2 left-1/2 z-50 max-w-md w-[calc(100%-32px)] bg-card rounded-3xl border border-border shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ x: '-50%', y: '-50%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 border-b border-border rounded-t-3xl ${bgColorMap[variant]}`}>
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className={variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-yellow-600' : 'text-blue-600'} />
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
        </div>

        <div className="p-6">
          <p className="text-foreground mb-6">{message}</p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2 border border-border rounded-lg text-foreground font-medium hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-6 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${buttonColorMap[variant]}`}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
