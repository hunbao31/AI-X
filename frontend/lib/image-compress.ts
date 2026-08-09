'use client';

// Client-side downscale + re-encode before upload — cuts bandwidth and
// server load without any backend dependency (no sharp/etc — see
// backend/src/forum/image.util.ts for why compression lives here instead).
// Falls back to the original file untouched on any failure; never blocks
// posting.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

function renameToJpg(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return `${base || 'photo'}.jpg`;
}

export async function compressImage(file: File): Promise<File> {
  // Animated GIFs would lose their animation if flattened to a single JPEG
  // frame — leave them exactly as uploaded.
  if (file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    // Skip the swap if re-encoding didn't actually save anything (e.g. a
    // tiny image that was already well-optimized).
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], renameToJpg(file.name), { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
