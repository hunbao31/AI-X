import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES } from './image.util';

// memoryStorage (not diskStorage): the service hashes the buffer for
// duplicate-detection and needs the raw bytes anyway before deciding
// whether/where to persist the file, so there's no benefit to an
// intermediate temp file on disk.
export const forumImageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException('Chỉ cho phép ảnh JPEG, PNG, WebP hoặc GIF.'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
