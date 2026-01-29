import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TripStatus, Prisma } from '@prisma/client';
import { DbService } from '../common/db/db.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction, AuditEntity } from '../common/audit/audit.constants';
import type { AuditContext } from '../common/audit/audit.types';
import * as bcrypt from 'bcrypt';

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

  async listUsers(search?: string, page: number = 1, limit: number = 20) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const normalizedSearch = search?.trim();

    const where: Prisma.UserWhereInput | undefined = normalizedSearch
      ? {
          OR: [
            { email: { contains: normalizedSearch, mode: Prisma.QueryMode.insensitive } },
            { firstName: { contains: normalizedSearch, mode: Prisma.QueryMode.insensitive } },
            { lastName: { contains: normalizedSearch, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : undefined;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          mustChangePassword: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
    };
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

  async setTemporaryPassword(
    userId: string,
    temporaryPassword: string,
    adminUserId?: string,
    context?: AuditContext,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const matchesCurrent = await bcrypt.compare(temporaryPassword, user.password);
    if (matchesCurrent) {
      throw new BadRequestException('Temporary password must be different from the current password');
    }

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        refreshToken: null,
      },
    });

    await this.audit.log({
      userId: adminUserId ?? null,
      entityType: AuditEntity.USER,
      entityId: userId,
      action: AuditAction.USER_TEMPORARY_PASSWORD_SET,
      before: user,
      after: { ...user, password: hashedPassword },
    }, context);

    return { message: 'Temporary password set successfully' };
  }

}
