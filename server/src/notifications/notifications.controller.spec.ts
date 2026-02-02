import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth/jwt-auth.guard";

describe("NotificationsController", () => {
  let controller: NotificationsController;
  const service = {
    list: jest.fn(),
    markRead: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it("uses defaults when listing notifications", async () => {
    service.list.mockResolvedValue([]);
    const req = { user: { id: "user-1" } };

    await controller.list(undefined, undefined, undefined, req);

    expect(service.list).toHaveBeenCalledWith("user-1", false, 1, 20);
  });

  it("passes query params to list", async () => {
    service.list.mockResolvedValue([]);
    const req = { user: { id: "user-1" } };

    await controller.list("true", "2", "5", req);

    expect(service.list).toHaveBeenCalledWith("user-1", true, 2, 5);
  });

  it("passes audit context when marking read", async () => {
    service.markRead.mockResolvedValue({});
    const req = {
      user: { id: "user-1" },
      ip: "127.0.0.1",
      headers: { "user-agent": "jest" },
    };

    await controller.markRead("note-1", req);

    expect(service.markRead).toHaveBeenCalledWith(
      "note-1",
      "user-1",
      expect.objectContaining({
        ip: "127.0.0.1",
        userAgent: "jest",
      }),
    );
  });

  it("passes audit context when deleting", async () => {
    service.delete.mockResolvedValue({});
    const req = {
      user: { id: "user-1" },
      ip: "127.0.0.1",
      headers: { "user-agent": "jest" },
    };

    await controller.delete("note-2", req);

    expect(service.delete).toHaveBeenCalledWith(
      "note-2",
      "user-1",
      expect.objectContaining({
        ip: "127.0.0.1",
        userAgent: "jest",
      }),
    );
  });
});
