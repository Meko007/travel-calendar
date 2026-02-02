import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { DbService } from "../common/db/db.service";
import { JwtService } from "@nestjs/jwt";
import jwtAuthConfig from "./config/jwt-auth.config";
import { AuditService } from "../common/audit/audit.service";
import { AuditAction, AuditEntity } from "../common/audit/audit.constants";
import * as bcrypt from "bcrypt";

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const audit = {
    log: jest.fn(),
  };

  const bcryptHash = bcrypt.hash as jest.Mock;
  const bcryptCompare = bcrypt.compare as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DbService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: AuditService, useValue: audit },
        {
          provide: jwtAuthConfig.KEY,
          useValue: {
            secret: "jwt-secret",
            refreshSecret: "refresh-secret",
            expiresIn: "15m",
            refreshExpiresIn: 3600,
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("signs up new users and logs audit", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    bcryptHash.mockResolvedValue("hashed-password");
    audit.log.mockResolvedValue({});

    const result = await service.signup({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "Password123!",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "ada@example.com",
        password: "hashed-password",
      }),
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AuditEntity.USER,
        action: AuditAction.USER_CREATED,
      }),
      undefined,
    );
    expect(result).toEqual({
      message: "User created successfully",
      user: {
        id: "user-1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    });
  });

  it("throws conflict when signing up with an existing email", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });

    await expect(
      service.signup({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "Password123!",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects login with invalid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      password: "hash",
      isActive: true,
      role: "USER",
    });
    bcryptCompare.mockResolvedValue(false);

    await expect(
      service.login({ email: "ada@example.com", password: "bad" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects login for deactivated users", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      password: "hash",
      isActive: false,
      role: "USER",
    });
    bcryptCompare.mockResolvedValue(true);

    await expect(
      service.login({ email: "ada@example.com", password: "Password123!" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("logs in active users and stores refresh token hash", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      password: "hash",
      isActive: true,
      role: "USER",
      mustChangePassword: false,
    });
    bcryptCompare.mockResolvedValue(true);
    jwt.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");
    bcryptHash.mockResolvedValue("refresh-hash");
    prisma.user.update.mockResolvedValue({
      id: "user-1",
      refreshToken: "refresh-hash",
    });
    audit.log.mockResolvedValue({});

    const result = await service.login({
      email: "ada@example.com",
      password: "Password123!",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { refreshToken: "refresh-hash" },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AuditEntity.USER,
        action: AuditAction.USER_LOGIN,
      }),
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: expect.objectContaining({
          id: "user-1",
          email: "ada@example.com",
          role: "USER",
        }),
      }),
    );
  });

  it("rejects refresh when token is missing", async () => {
    await expect(
      service.refreshTokens({ refreshToken: "" as any }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects refresh when token is invalid", async () => {
    jwt.verifyAsync.mockRejectedValue(new Error("bad"));

    await expect(
      service.refreshTokens({ refreshToken: "bad-token" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects refresh when stored hash does not match", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: "user-1" });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      role: "USER",
      refreshToken: "stored-hash",
    });
    bcryptCompare.mockResolvedValue(false);

    await expect(
      service.refreshTokens({ refreshToken: "refresh-token" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("refreshes tokens and stores new refresh hash", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: "user-1" });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      role: "USER",
      refreshToken: "stored-hash",
    });
    bcryptCompare.mockResolvedValue(true);
    jwt.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");
    bcryptHash.mockResolvedValue("new-refresh-hash");
    prisma.user.update.mockResolvedValue({
      id: "user-1",
      refreshToken: "new-refresh-hash",
    });
    audit.log.mockResolvedValue({});

    const result = await service.refreshTokens({
      refreshToken: "refresh-token",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { refreshToken: "new-refresh-hash" },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AuditEntity.USER,
        action: AuditAction.USER_TOKEN_REFRESHED,
      }),
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      }),
    );
  });

  it("rejects password changes with invalid old password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      password: "hash",
    });
    bcryptCompare.mockResolvedValue(false);

    await expect(
      service.changePassword("user-1", "old", "new"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects password changes when new password matches old", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      password: "hash",
    });
    bcryptCompare.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    await expect(
      service.changePassword("user-1", "old", "old"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("changes password and logs audit", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      password: "hash",
    });
    bcryptCompare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    bcryptHash.mockResolvedValue("new-hash");
    prisma.user.update.mockResolvedValue({
      id: "user-1",
      password: "new-hash",
      mustChangePassword: false,
      refreshToken: null,
    });
    audit.log.mockResolvedValue({});

    const result = await service.changePassword("user-1", "old", "new");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        password: "new-hash",
        mustChangePassword: false,
        refreshToken: null,
      },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AuditEntity.USER,
        action: AuditAction.USER_PASSWORD_CHANGED,
      }),
      undefined,
    );
    expect(result).toEqual({ message: "Password changed successfully" });
  });

  it("throws when getMe cannot find user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getMe("user-404")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
