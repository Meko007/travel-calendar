import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { DbService } from "../common/db/db.service";
import { AuditService } from "../common/audit/audit.service";
import { NotFoundException } from "@nestjs/common";
import { AuditAction, AuditEntity } from "../common/audit/audit.constants";

describe("NotificationsService", () => {
  let service: NotificationsService;

  const prisma = {
    notification: {
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
        NotificationsService,
        { provide: DbService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("lists notifications with filters and pagination", async () => {
    prisma.notification.findMany.mockResolvedValue([]);

    await service.list("user-1", true, 2, 5);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        readAt: null,
      },
      include: { trip: true },
      orderBy: { createdAt: "desc" },
      skip: 5,
      take: 5,
    });
  });

  it("marks a notification as read and logs audit entry", async () => {
    const existing = {
      id: "note-1",
      userId: "user-1",
      readAt: null,
    };
    const updated = {
      ...existing,
      readAt: new Date("2099-01-01T00:00:00Z"),
    };

    prisma.notification.findUnique.mockResolvedValue(existing);
    prisma.notification.update.mockResolvedValue(updated);
    audit.log.mockResolvedValue({});

    const result = await service.markRead("note-1", "user-1");

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: "note-1" },
      data: { readAt: expect.any(Date) },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        entityType: AuditEntity.NOTIFICATION,
        entityId: "note-1",
        action: AuditAction.NOTIFICATION_READ,
        before: existing,
        after: updated,
      }),
      undefined,
    );
    expect(result).toEqual(updated);
  });

  it("throws when marking a missing notification as read", async () => {
    prisma.notification.findUnique.mockResolvedValue(null);

    await expect(service.markRead("note-1", "user-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("deletes a notification and logs audit entry", async () => {
    const existing = { id: "note-2", userId: "user-1" };
    prisma.notification.findUnique.mockResolvedValue(existing);
    prisma.notification.delete.mockResolvedValue(existing);
    audit.log.mockResolvedValue({});

    const result = await service.delete("note-2", "user-1");

    expect(prisma.notification.delete).toHaveBeenCalledWith({
      where: { id: "note-2" },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        entityType: AuditEntity.NOTIFICATION,
        entityId: "note-2",
        action: AuditAction.NOTIFICATION_DELETED,
        before: existing,
        after: null,
      }),
      undefined,
    );
    expect(result).toEqual(existing);
  });

  it("throws when deleting a notification for a different user", async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: "note-2",
      userId: "other-user",
    });

    await expect(service.delete("note-2", "user-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
