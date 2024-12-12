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

  private async uploadLicenseFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `licenses/${fileName}`;

    const { error: uploadError, data } = await this.supabase.storage
      .from('lawyer-licenses')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException('파일 업로드에 실패했습니다.');
    }

    return filePath;
  }

  async signUp(signUpDto: SignUpDto, licenseFile: Express.Multer.File) {
    // 파일 유효성 검사
    validateFile(licenseFile);

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);

    // 트랜잭션 시작
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .insert([
        {
          email: signUpDto.email,
          password: hashedPassword,
          name: signUpDto.name,
          nickname: signUpDto.nickname,
          phone: signUpDto.phone,
          status: 'PENDING', // 관리자 승인 대기 상태
        },
      ])
      .select()
      .single();

    if (userError) {
      throw new BadRequestException('회원가입에 실패했습니다.');
    }

    // 파일 업로드
    const filePath = await this.uploadLicenseFile(licenseFile, user.id);

    // 라이센스 정보 저장
    const { error: licenseError } = await this.supabase
      .from('lawyer_licenses')
      .insert([
        {
          user_id: user.id,
          file_path: filePath,
          status: 'PENDING',
        },
      ]);

    if (licenseError) {
      // 롤백: 업로드된 파일과 사용자 정보 삭제
      await this.supabase.storage.from('lawyer-licenses').remove([filePath]);
      await this.supabase.from('users').delete().eq('id', user.id);
      throw new BadRequestException('자격증 정보 저장에 실패했습니다.');
    }

    return {
      message: '회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.',
    };
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
