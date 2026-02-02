import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateTripDto, UpdateTripDto } from "./dto/trips.dto";
import { DbService } from "../common/db/db.service";
import { TripStatus } from "@prisma/client";
import { AuditService } from "../common/audit/audit.service";
import { AuditAction, AuditEntity } from "../common/audit/audit.constants";
import type { AuditContext } from "../common/audit/audit.types";

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: DbService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTripDto, userId: string, context?: AuditContext) {
    const { tripDateTime, returnTripDateTime } = this.normalizeTripDates(
      dto.tripDateTime,
      dto.returnTripDateTime,
    );

    const created = await this.prisma.trip.create({
      data: {
        destination: dto.destination,
        tripDateTime,
        returnTripDateTime,
        mode: dto.mode,
        returnMode: dto.returnMode ?? dto.mode,
        userId,
      },
    });

    await this.audit.log(
      {
        userId,
        entityType: AuditEntity.TRIP,
        entityId: created.id,
        action: AuditAction.TRIP_CREATED,
        before: null,
        after: created,
      },
      context,
    );

    return created;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    userId: string,
    status?: string,
  ) {
    const parsedStatus = this.parseStatus(status);
    return await this.prisma.trip.findMany({
      where: {
        userId,
        ...(parsedStatus ? { status: parsedStatus } : {}),
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        tripDateTime: "asc",
      },
    });
  }

  async findById(id: string, userId: string) {
    return await this.prisma.trip.findUnique({
      where: {
        id,
        userId,
      },
    });
  }

  // async findByDestination(destination: string, userId: string) {
  //   return await this.prisma.trip.findMany({
  //     where: {
  //       destination: {
  //         contains: destination,
  //       },
  //       userId,
  //     },
  //   });
  // }

  async findByDate(date: string, userId: string) {
    const datePart = date.split("T")[0];
    const [year, month, day] = datePart
      .split("-")
      .map((value) => Number(value));
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 1);

    return await this.prisma.trip.findMany({
      where: {
        userId,
        tripDateTime: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        tripDateTime: "asc",
      },
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTripDto,
    context?: AuditContext,
  ) {
    const data = this.normalizeUpdateDto(dto);
    const before = await this.prisma.trip.findUnique({
      where: {
        id,
        userId,
      },
    });

    const updated = await this.prisma.trip.update({
      where: {
        id,
        userId,
      },
      data,
    });

    await this.audit.log(
      {
        userId,
        entityType: AuditEntity.TRIP,
        entityId: updated.id,
        action: AuditAction.TRIP_UPDATED,
        before,
        after: updated,
      },
      context,
    );

    return updated;
  }

  async resubmit(
    id: string,
    userId: string,
    dto: UpdateTripDto,
    context?: AuditContext,
  ) {
    const existing = await this.prisma.trip.findUnique({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException("Trip not found");
    }

    if (existing.status !== TripStatus.REJECTED) {
      throw new BadRequestException("Only rejected trips can be resubmitted");
    }

    const data = this.normalizeUpdateDto(dto);
    const updated = await this.prisma.trip.update({
      where: { id, userId },
      data: {
        ...data,
        status: TripStatus.PENDING,
        rejectionReason: null,
      },
    });

    await this.audit.log(
      {
        userId,
        entityType: AuditEntity.TRIP,
        entityId: updated.id,
        action: AuditAction.TRIP_RESUBMITTED,
        before: existing,
        after: updated,
      },
      context,
    );

    return updated;
  }

  async delete(id: string, userId: string, context?: AuditContext) {
    const existing = await this.prisma.trip.findUnique({
      where: {
        id,
        userId,
      },
    });

    await this.prisma.trip.delete({
      where: {
        id,
        userId,
      },
    });

    await this.audit.log(
      {
        userId,
        entityType: AuditEntity.TRIP,
        entityId: id,
        action: AuditAction.TRIP_DELETED,
        before: existing,
        after: null,
      },
      context,
    );

    return { message: "Trip deleted successfully" };
  }

  private normalizeTripDates(
    tripDateTimeRaw: string,
    returnTripDateTimeRaw: string,
  ) {
    const tripDateTime = new Date(tripDateTimeRaw);
    const returnTripDateTime = new Date(returnTripDateTimeRaw);

    if (
      Number.isNaN(tripDateTime.getTime()) ||
      Number.isNaN(returnTripDateTime.getTime())
    ) {
      throw new BadRequestException("Invalid trip date/time");
    }

    if (returnTripDateTime < tripDateTime) {
      throw new BadRequestException(
        "Return date must be on or after the departure date",
      );
    }

    return { tripDateTime, returnTripDateTime };
  }

  private normalizeUpdateDto(dto: UpdateTripDto) {
    const data: any = { ...dto };
    let tripDateTime: Date | undefined;
    let returnTripDateTime: Date | undefined;

    if (dto.tripDateTime) {
      tripDateTime = new Date(dto.tripDateTime);
      if (Number.isNaN(tripDateTime.getTime())) {
        throw new BadRequestException("Invalid trip date/time");
      }
      data.tripDateTime = tripDateTime;
    }

    if (dto.returnTripDateTime) {
      returnTripDateTime = new Date(dto.returnTripDateTime);
      if (Number.isNaN(returnTripDateTime.getTime())) {
        throw new BadRequestException("Invalid trip date/time");
      }
      data.returnTripDateTime = returnTripDateTime;
    }

    if (
      tripDateTime &&
      returnTripDateTime &&
      returnTripDateTime < tripDateTime
    ) {
      throw new BadRequestException(
        "Return date must be on or after the departure date",
      );
    }

    if (dto.returnMode === undefined) {
      delete data.returnMode;
    }

    return data;
  }

  private parseStatus(status?: string) {
    if (!status) {
      return undefined;
    }
    const normalized = status.toUpperCase();
    if (!Object.values(TripStatus).includes(normalized as TripStatus)) {
      throw new BadRequestException("Invalid status filter");
    }
    return normalized as TripStatus;
  }
}
