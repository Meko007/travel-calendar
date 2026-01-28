import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import jwtAuthConfig from './config/jwt-auth.config';
import type { ConfigType } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { buildAuditContext } from '../common/audit/audit.utils';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(jwtAuthConfig.KEY)
    private authConfig: ConfigType<typeof jwtAuthConfig>,
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'prod';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/auth/refresh',
      maxAge: this.authConfig.refreshExpiresIn * 1000,
    });
  }

  @Post('signup')
  create(@Body() dto: SignupDto, @Req() req) {
    return this.authService.signup(dto, buildAuditContext(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res) {
    const { refreshToken, ...result } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res) {
    const { refreshToken, ...result } = await this.authService.adminLogin(dto);
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    const { refreshToken: newRefreshToken, ...result } =
      await this.authService.refreshTokens(refreshToken);
    this.setRefreshCookie(res, newRefreshToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return this.authService.getMe(req.user.id);
  }

}
