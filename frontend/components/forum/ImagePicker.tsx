'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { compressImage } from '@/lib/image-compress';
import { popIn } from '@/lib/animations';

interface ImagePickerProps {
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

// Camera capture on mobile (capture="environment" opens the rear camera
// directly where supported) or a regular file picker on desktop — same
// <input>, the browser decides which UI to show. Selected images are
// downscaled/re-encoded client-side (lib/image-compress.ts) before the
// preview even renders, so what gets uploaded is already the compressed copy.
export function ImagePicker({ onChange, disabled }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(raw: File | undefined) {
    if (!raw) return;
    setCompressing(true);
    try {
      const file = await compressImage(raw);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      onChange(file);
    } finally {
      setCompressing(false);
    }
  }

  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  if (preview) {
    return (
      <motion.div variants={popIn} initial="hidden" animate="show" className="space-y-2">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Ảnh câu hỏi đã chọn" className="max-h-80 w-full object-contain" />
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="text-sm font-medium text-red-300 hover:text-red-200 disabled:opacity-50"
        >
          ✕ Xóa ảnh
        </button>
      </motion.div>
    );
  }

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-10 text-center transition-colors duration-200 hover:border-indigo-400/50 hover:bg-white/10 ${
        disabled || compressing ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <span className="text-4xl">📷</span>
      <span className="text-sm font-medium text-white">
        {compressing ? 'Đang xử lý ảnh…' : 'Chụp ảnh hoặc tải ảnh lên'}
      </span>
      <span className="text-xs text-slate-400">JPEG, PNG, WebP hoặc GIF · tối đa 5MB</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        disabled={disabled || compressing}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
    </label>
  );
}
