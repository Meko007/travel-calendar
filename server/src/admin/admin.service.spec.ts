import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { DbService } from "../common/db/db.service";
import { AuditService } from "../common/audit/audit.service";
import { NotificationType, TripStatus } from "@prisma/client";
import { AuditAction, AuditEntity } from "../common/audit/audit.constants";

describe("AdminService", () => {
  let service: AdminService;

  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trip: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };
  const audit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DbService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("normalizes listUsers pagination and search", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const result = await service.listUsers("  Ada ", 0, 500);

    const args = prisma.user.findMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(100);
    expect(args.where.OR[0].email.contains).toBe("Ada");
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("approves a pending trip and notifies user", async () => {
    prisma.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      userId: "user-1",
      destination: "Paris",
      status: TripStatus.PENDING,
    });
    prisma.trip.update.mockResolvedValue({
      id: "trip-1",
      status: TripStatus.APPROVED,
      rejectionReason: null,
    });
    prisma.notification.create.mockResolvedValue({});
    audit.log.mockResolvedValue({});

    await service.approveTrip("trip-1", "admin-1");

    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: { status: TripStatus.APPROVED, rejectionReason: null },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        tripId: "trip-1",
        type: NotificationType.TRIP_APPROVED,
      }),
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AuditEntity.TRIP,
        action: AuditAction.TRIP_APPROVED,
      }),
      undefined,
    );
  });

  it("rejects a trip when reason is missing", async () => {
    prisma.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      userId: "user-1",
      destination: "Paris",
      status: TripStatus.PENDING,
    });

    await expect(
      service.rejectTrip("trip-1", "   ", "admin-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a pending trip and records rejection reason", async () => {
    prisma.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      userId: "user-1",
      destination: "Paris",
      status: TripStatus.PENDING,
    });
    prisma.trip.update.mockResolvedValue({
      id: "trip-1",
      status: TripStatus.REJECTED,
      rejectionReason: "Missing policy",
    });
    prisma.notification.create.mockResolvedValue({});
    audit.log.mockResolvedValue({});

    await service.rejectTrip("trip-1", "  Missing policy  ", "admin-1");

    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      data: { status: TripStatus.REJECTED, rejectionReason: "Missing policy" },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: NotificationType.TRIP_REJECTED,
        reason: "Missing policy",
      }),
    });
  });

  it("throws when approving a missing or resolved trip", async () => {
    prisma.trip.findUnique.mockResolvedValue(null);

    await expect(
      service.approveTrip("trip-404", "admin-1"),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      userId: "user-1",
      destination: "Paris",
      status: TripStatus.APPROVED,
    });

    await expect(
      service.approveTrip("trip-1", "admin-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
