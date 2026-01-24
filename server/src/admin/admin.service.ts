import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TripStatus } from '@prisma/client';
import { DbService } from '../common/db/db.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: DbService) {}

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

  async approveTrip(id: string) {
    return this.updateTripStatus(id, TripStatus.APPROVED);
  }

  async rejectTrip(id: string, reason: string) {
    return this.updateTripStatus(id, TripStatus.REJECTED, reason);
  }

  private async updateTripStatus(id: string, status: TripStatus, reason?: string) {
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

    return updated;
  }
}
