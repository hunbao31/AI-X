import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const MAX_EXCEL_BYTES = 5 * 1024 * 1024; // question banks are tiny text data

// Browsers/OS report .xlsx inconsistently (real mimetype vs generic
// octet-stream), so the extension is checked alongside the mimetype rather
// than relied on alone.
const ALLOWED_EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

export const excelImportMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_EXCEL_BYTES, files: 1 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    const hasXlsxExt = /\.xlsx$/i.test(file.originalname);
    if (!hasXlsxExt || !ALLOWED_EXCEL_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException('Chỉ chấp nhận tệp Excel .xlsx.'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
