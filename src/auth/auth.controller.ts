// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UploadedFile,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UploadFile } from 'src/common/decorators/file-upload.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @UploadFile('license', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  })
  signUp(
    @Body() signUpDto: SignUpDto,
    @UploadedFile() licenseFile: Express.Multer.File,
  ) {
    return this.authService.signUp(signUpDto, licenseFile);
  }

  @Post('sign-in')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req) {
    return this.authService.getMe(req.user.sub);
  }
}
