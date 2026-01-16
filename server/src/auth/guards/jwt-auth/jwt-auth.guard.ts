import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
// import { IS_PUBLIC_KEY } from 'src/auth/decorators/public.decorator';
 
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private getJwtSecret(): string {
    return process.env.JWT_SECRET || 'defaultSecret';
  }

  constructor() {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      console.error('JWT Guard - No token found in authorization header');
      throw new UnauthorizedException('Not authenticated');
    }
    
    try {
      const secret = this.getJwtSecret();
      const decoded = jwt.verify(token, secret) as any;
      console.log('JWT Guard - Decoded token:', { sub: decoded.sub, email: decoded.email });
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        // role: decoded.role,
      }; // attach user to request
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}