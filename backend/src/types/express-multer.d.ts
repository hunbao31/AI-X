// Hand-written stand-in for @types/multer's `Express.Multer.File` shape.
//
// This environment's npm registry access fails TLS verification
// (UNABLE_TO_VERIFY_LEAF_SIGNATURE), so `@types/multer` couldn't be
// installed. multer itself IS present (a transitive dependency of
// @nestjs/platform-express) and works fine at runtime — only its type
// declarations are missing. This file supplies just enough of the real
// package's shape for `@UploadedFile() file: Express.Multer.File` to
// typecheck. Delete this file and run `npm install -D @types/multer`
// once registry access is restored; the shapes are compatible so nothing
// else needs to change.

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      // memoryStorage (used here) populates buffer; diskStorage would
      // populate destination/filename/path instead.
      buffer: Buffer;
      destination?: string;
      filename?: string;
      path?: string;
    }
  }

  interface Request {
    file?: Multer.File;
    files?:
      | Multer.File[]
      | { [fieldname: string]: Multer.File[] };
  }
}

// Minimal shape for the one export this codebase actually imports
// (`memoryStorage`) — see upload.config.ts. Same "delete once @types/multer
// installs" note as above.
declare module 'multer' {
  interface StorageEngine {
    _handleFile: (...args: unknown[]) => void;
    _removeFile: (...args: unknown[]) => void;
  }
  export function memoryStorage(): StorageEngine;
}
