// src/utils/file.utils.ts
import { BadRequestException } from '@nestjs/common';

export const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

export function validateFile(file: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('변호사 자격증 파일이 필요합니다.');
  }

  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      '허용되지 않는 파일 형식입니다. (jpeg, png, pdf만 가능)',
    );
  }

  if (file.size > FILE_SIZE_LIMIT) {
    throw new BadRequestException('파일 크기는 5MB를 초과할 수 없습니다.');
  }
}
