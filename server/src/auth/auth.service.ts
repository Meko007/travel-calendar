import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { DbService } from '../common/db/db.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import jwtAuthConfig from './config/jwt-auth.config';
import type { ConfigType } from '@nestjs/config';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction, AuditEntity } from '../common/audit/audit.constants';
import type { AuditContext } from '../common/audit/audit.types';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: DbService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,

    @Inject(jwtAuthConfig.KEY)
    private authConfig: ConfigType<typeof jwtAuthConfig>,
  ) {}

  async signup(dto: SignupDto, context?: AuditContext) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        ...dto,
        password: hash,
      }
    });

    await this.audit.log({
      userId: newUser.id,
      entityType: AuditEntity.USER,
      entityId: newUser.id,
      action: AuditAction.USER_CREATED,
      before: null,
      after: newUser,
    }, context);

    return {
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.authConfig.secret,
        expiresIn: this.authConfig.expiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.authConfig.refreshSecret,
        expiresIn: this.authConfig.refreshExpiresIn,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new ConflictException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      message: 'Login successful',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    }
  }

  async adminLogin(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new ConflictException('Invalid email or password');
    }

    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Access denied: Admins only');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      message: 'Login successful',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    }
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const { refreshToken } = dto;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.authConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      message: 'Token refreshed successfully',
      ...tokens,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { user };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
      throw new UnauthorizedException('Old password is incorrect');
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BadRequestException('New password must be different from the current password');
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedNewPassword,
        mustChangePassword: false,
        refreshToken: null,
      },
    });
    return { message: 'Password changed successfully' };
  }

}
