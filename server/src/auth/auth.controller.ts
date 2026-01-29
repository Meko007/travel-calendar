import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Response } from 'express';
import jwtAuthConfig from './config/jwt-auth.config';
import type { ConfigType } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('Authentication')
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
  @ApiOperation({ summary: 'User signup '})
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'User has been successfully created.' })
  create(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login '})
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User hassuccessfully logged in.' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res) {
    const { refreshToken, ...result } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login '})
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Admin has successfully logged in.' })
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res) {
    const { refreshToken, ...result } = await this.authService.adminLogin(dto);
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh tokens '})
  @ApiResponse({ status: 200, description: 'Tokens have been successfully refreshed.' })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const refreshToken = req.cookies?.refreshToken as string;
    const { refreshToken: newRefreshToken, ...result } =
      await this.authService.refreshTokens({ refreshToken });
    this.setRefreshCookie(res, newRefreshToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change user password '})
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password has been successfully changed.' })
  @HttpCode(HttpStatus.OK)
  changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user info '})
  @ApiResponse({ status: 200, description: 'Current user info retrieved successfully.' })
  me(@Req() req) {
    return this.authService.getMe(req.user.id);
  }

}
