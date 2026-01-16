import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { DbService } from '../common/db/db.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import jwtAuthConfig from './config/jwt-auth.config';
import type { ConfigType } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: DbService,
    private readonly jwtService: JwtService,

    @Inject(jwtAuthConfig.KEY)
    private authConfig: ConfigType<typeof jwtAuthConfig>,
  ) {}

  async signup(dto: SignupDto) {
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

  private generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return this.jwtService.signAsync(payload, {
      secret: this.authConfig.secret,
      expiresIn: this.authConfig.expiresIn,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new ConflictException('Invalid email or password');
    }

    const accessToken = await this.generateToken(user.id, user.email);

    return {
      message: 'Login successful',
      accessToken,
    }
  }

}
