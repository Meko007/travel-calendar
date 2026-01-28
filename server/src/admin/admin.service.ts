import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TripStatus } from '@prisma/client';
import { DbService } from '../common/db/db.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction, AuditEntity } from '../common/audit/audit.constants';
import type { AuditContext } from '../common/audit/audit.types';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: DbService,
    private readonly audit: AuditService,
  ) {}

  private parseStatus(status?: string): TripStatus {
    if (!status) {
      return TripStatus.PENDING;
    }

    const normalized = status.toUpperCase();
    if (!Object.values(TripStatus).includes(normalized as TripStatus)) {
      throw new BadRequestException('Invalid status filter');
    }

    return normalized as TripStatus;
  }

  async listTrips(status?: string, page: number = 1, limit: number = 10) {
    const resolvedStatus = this.parseStatus(status);
    return this.prisma.trip.findMany({
      where: {
        status: resolvedStatus,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        tripDateTime: 'asc',
      },
    });
  }

  async approveTrip(id: string, adminUserId: string, context?: AuditContext) {
    return this.updateTripStatus(id, TripStatus.APPROVED, undefined, adminUserId, context);
  }

  async rejectTrip(id: string, reason: string, adminUserId: string, context?: AuditContext) {
    return this.updateTripStatus(id, TripStatus.REJECTED, reason, adminUserId, context);
  }

  private async updateTripStatus(
    id: string,
    status: TripStatus,
    reason?: string,
    adminUserId?: string,
    context?: AuditContext,
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    if (trip.status !== TripStatus.PENDING) {
      throw new BadRequestException('Trip has already been resolved');
    }
    if (status === TripStatus.REJECTED && (!reason || !reason.trim())) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === TripStatus.REJECTED ? reason!.trim() : null,
      },
    });

    const type =
      status === TripStatus.APPROVED
        ? NotificationType.TRIP_APPROVED
        : NotificationType.TRIP_REJECTED;

    await this.prisma.notification.create({
      data: {
        userId: trip.userId,
        tripId: trip.id,
        type,
        message:
          status === TripStatus.APPROVED
            ? `Trip to ${trip.destination} approved.`
            : `Trip to ${trip.destination} rejected.`,
        reason: status === TripStatus.REJECTED ? reason!.trim() : null,
      },
    });

    await this.audit.log({
      userId: adminUserId ?? null,
      entityType: AuditEntity.TRIP,
      entityId: updated.id,
      action: status === TripStatus.APPROVED ? AuditAction.TRIP_APPROVED : AuditAction.TRIP_REJECTED,
      before: trip,
      after: updated,
    }, context);

    return updated;
  }
}
