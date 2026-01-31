import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DbService } from '../../../common/db/db.service';
// import { IS_PUBLIC_KEY } from 'src/auth/decorators/public.decorator';
 
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private getJwtSecret(): string {
    return process.env.JWT_SECRET || 'defaultSecret';
  }

  constructor(private readonly prisma: DbService) {}

  private isPasswordChangeRoute(req: any): boolean {
    const method = req?.method;
    const routePath = req?.route?.path;
    const originalUrl = req?.originalUrl;
    if (method !== 'POST') {
      return false;
    }
    if (routePath === 'change-password' || routePath === '/change-password') {
      return true;
    }
    if (typeof originalUrl === 'string' && originalUrl.includes('/auth/change-password')) {
      return true;
    }
    return false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { mustChangePassword: true, isActive: true },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (!user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }
      if (user.mustChangePassword && !this.isPasswordChangeRoute(req)) {
        throw new ForbiddenException('Password change required');
      }
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        mustChangePassword: user.mustChangePassword,
      }; // attach user to request
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
