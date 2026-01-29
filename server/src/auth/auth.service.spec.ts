import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DbService } from '../common/db/db.service';
import { JwtService } from '@nestjs/jwt';
import jwtAuthConfig from './config/jwt-auth.config';
import { AuditService } from '../common/audit/audit.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DbService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: jwtAuthConfig.KEY, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
