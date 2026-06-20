import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@/common/enums/role.enum';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private sign(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME') ?? '7d',
    } as any);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME') ?? '30d',
    } as any);
    return { accessToken, refreshToken };
  }

  private publicUser(u: { id: string; email: string; fullName: string; role: string; color: string | null }) {
    return { id: u.id, email: u.email, fullName: u.fullName, role: u.role, color: u.color };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) {
      throw new BadRequestException('Email đã được đăng ký');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const palette = ['#ff6b35', '#0a84ff', '#22c55e', '#7c5cff', '#ff9f0a', '#ec4899', '#14b8a6'];
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hash,
        fullName: dto.fullName.trim(),
        role: Role.USER,
        active: true,
        color: palette[Math.floor(Math.random() * palette.length)],
      },
    });
    return { ...this.sign(user), user: this.publicUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!user.active) {
      throw new UnauthorizedException('Tài khoản đã bị khoá');
    }
    return { ...this.sign(user), user: this.publicUser(user) };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.active) {
        throw new UnauthorizedException();
      }
      return { ...this.sign(user), user: this.publicUser(user) };
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.publicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.oldPassword, user.password))) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });
    return { message: 'Đổi mật khẩu thành công' };
  }
}
