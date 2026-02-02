import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { DbService } from "../common/db/db.service";
import { AuditService } from "../common/audit/audit.service";

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DbService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
