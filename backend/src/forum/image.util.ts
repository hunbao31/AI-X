// Local-disk image storage for forum uploads. "Local for now" per spec —
// swapping to S3/Cloudinary later means replacing saveForumImage's body
// with an SDK call that returns a public URL; nothing else in the forum
// module needs to change, since callers only ever see the returned path.
//
// KNOWN LIMITATION: local disk storage does not survive redeploys on
// ephemeral filesystems (Railway, most container platforms). Fine for
// development; production should point this at real object storage.

import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export const FORUM_UPLOAD_DIR = join(process.cwd(), 'uploads', 'forum');
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_EXT);

// Cheap, dependency-free magic-byte check, cross-referenced against the
// client-declared Content-Type (which fileFilter already whitelisted) —
// catches a renamed file lying about its mimetype without needing a
// file-type-sniffing library.
export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function hashImage(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function ensureForumUploadDir(): Promise<void> {
  await fs.mkdir(FORUM_UPLOAD_DIR, { recursive: true });
}

// Persists the buffer under a random filename; returns a path relative to
// the API origin (the frontend prefixes it with NEXT_PUBLIC_API_URL).
export async function saveForumImage(buffer: Buffer, mimetype: string): Promise<string> {
  const ext = MIME_EXT[mimetype] ?? '.jpg';
  const filename = `${randomUUID()}${ext}`;
  await fs.writeFile(join(FORUM_UPLOAD_DIR, filename), buffer);
  return `/uploads/forum/${filename}`;
}
