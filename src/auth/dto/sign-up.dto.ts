// src/auth/dto/sign-up.dto.ts
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

// 파일 업로드용 DTO 추가
export class SignUpWithLicenseDto extends SignUpDto {
  @IsNotEmpty()
  license: Express.Multer.File;
}
