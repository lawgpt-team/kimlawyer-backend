// src/common/decorators/file-upload.decorator.ts
import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export function UploadFile(fieldName: string, options?: MulterOptions) {
  return UseInterceptors(FileInterceptor(fieldName, options));
}
