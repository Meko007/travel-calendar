import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TripsService } from "./trips.service";
import { DbService } from "../common/db/db.service";
import { AuditService } from "../common/audit/audit.service";
import { AuditAction, AuditEntity } from "../common/audit/audit.constants";
import { ModeType, TripStatus } from "@prisma/client";

describe("TripsService", () => {
  let service: TripsService;

  const prisma = {
    trip: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const audit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: DbService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
  });

  it("creates a trip and defaults return mode", async () => {
    const created = {
      id: "trip-1",
      destination: "Paris",
      tripDateTime: new Date("2099-03-01T09:00:00Z"),
      returnTripDateTime: new Date("2099-03-03T09:00:00Z"),
      mode: ModeType.AIR,
      returnMode: ModeType.AIR,
      userId: "user-1",
    };
    prisma.trip.create.mockResolvedValue(created);
    audit.log.mockResolvedValue({});

    await service.create(
      {
        destination: "Paris",
        tripDateTime: "2099-03-01T09:00:00Z",
        returnTripDateTime: "2099-03-03T09:00:00Z",
        mode: ModeType.AIR,
      },
      "user-1",
    );

    expect(prisma.trip.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        destination: "Paris",
        tripDateTime: expect.any(Date),
        returnTripDateTime: expect.any(Date),
        mode: ModeType.AIR,
        returnMode: ModeType.AIR,
        userId: "user-1",
      }),
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        entityType: AuditEntity.TRIP,
        action: AuditAction.TRIP_CREATED,
      }),
      undefined,
    );
  });

  it("rejects invalid trip date ranges", async () => {
    await expect(
      service.create(
        {
          destination: "Paris",
          tripDateTime: "bad-date",
          returnTripDateTime: "2099-03-03T09:00:00Z",
          mode: ModeType.AIR,
        },
        "user-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(
        {
          destination: "Paris",
          tripDateTime: "2099-03-04T09:00:00Z",
          returnTripDateTime: "2099-03-03T09:00:00Z",
          mode: ModeType.AIR,
        },
        "user-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("resubmits rejected trips and clears rejection reason", async () => {
    const existing = {
      id: "trip-1",
      userId: "user-1",
      status: TripStatus.REJECTED,
      rejectionReason: "Missing info",
    };
    const updated = {
      ...existing,
      status: TripStatus.PENDING,
      rejectionReason: null,
    };
    prisma.trip.findUnique.mockResolvedValue(existing);
    prisma.trip.update.mockResolvedValue(updated);
    audit.log.mockResolvedValue({});

    await service.resubmit(
      "trip-1",
      "user-1",
      { destination: "Rome" },
    );

    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: "trip-1", userId: "user-1" },
      data: expect.objectContaining({
        destination: "Rome",
        status: TripStatus.PENDING,
        rejectionReason: null,
      }),
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AuditEntity.TRIP,
        action: AuditAction.TRIP_RESUBMITTED,
      }),
      undefined,
    );
  });

  it("blocks resubmit when trip is missing or already resolved", async () => {
    prisma.trip.findUnique.mockResolvedValue(null);

    await expect(
      service.resubmit("trip-1", "user-1", {}),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      userId: "user-1",
      status: TripStatus.APPROVED,
    });

    await expect(
      service.resubmit("trip-1", "user-1", {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid status filters", async () => {
    await expect(
      service.findAll(1, 10, "user-1", "bogus"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
