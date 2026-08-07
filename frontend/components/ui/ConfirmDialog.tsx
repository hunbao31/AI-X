'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './Button';
import { overlayFade, popIn } from '@/lib/animations';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Reusable pop-in confirmation modal — used anywhere a destructive action
// (delete a set, etc) needs a real themed confirm instead of a native
// window.confirm().
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={overlayFade}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onCancel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            variants={popIn}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
          >
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm text-slate-300">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onCancel} disabled={busy}>
                Hủy
              </Button>
              <Button
                variant={danger ? 'danger' : 'primary'}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? 'Đang xử lý…' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
