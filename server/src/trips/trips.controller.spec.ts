import { Test, TestingModule } from "@nestjs/testing";
import { TripsController } from "./trips.controller";
import { TripsService } from "./trips.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth/jwt-auth.guard";

describe("TripsController", () => {
  let controller: TripsController;

  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByDate: jest.fn(),
    update: jest.fn(),
    resubmit: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripsController],
      providers: [{ provide: TripsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TripsController>(TripsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
