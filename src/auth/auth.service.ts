// src/auth/auth.service.ts
import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { validateFile } from 'src/utils/file.utils';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private supabase: SupabaseClient,
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto, licenseFile: Express.Multer.File) {
    // 파일 유효성 검사
    validateFile(licenseFile);

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);

    // 먼저 파일을 업로드
    const fileExt = licenseFile.originalname.split('.').pop();
    const tempFileName = `temp-${Date.now()}.${fileExt}`;
    const tempFilePath = `temp/${tempFileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('lawyer-licenses')
      .upload(tempFilePath, licenseFile.buffer, {
        contentType: licenseFile.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException('파일 업로드에 실패했습니다.');
    }

    try {
      // 데이터베이스 작업을 트랜잭션으로 처리
      const { error } = await this.supabase.rpc('create_lawyer_account', {
        p_email: signUpDto.email,
        p_password: hashedPassword,
        p_name: signUpDto.name,
        p_nickname: signUpDto.nickname,
        p_phone: signUpDto.phone,
        p_file_path: tempFilePath,
      });

      if (error) {
        // 트랜잭션 실패 시 업로드된 파일 삭제
        await this.supabase.storage
          .from('lawyer-licenses')
          .remove([tempFilePath]);
        throw error;
      }

      return {
        message: '회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.',
      };
    } catch (error) {
      // 에러 발생 시 업로드된 파일 삭제
      await this.supabase.storage
        .from('lawyer-licenses')
        .remove([tempFilePath]);
      throw new BadRequestException('회원가입에 실패했습니다.');
    }
  }

  async signIn(signInDto: SignInDto) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', signInDto.email)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      signInDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'APPROVED') {
      throw new UnauthorizedException('승인 대기 중인 계정입니다.');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getMe(userId: number) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, email, name, nickname, phone, status')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return user;
  }
}
