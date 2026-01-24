import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../common/db/db.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: DbService) {}

  async list(userId: string, unreadOnly: boolean = false, page: number = 1, limit: number = 20) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      include: {
        trip: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async markRead(id: string, userId: string) {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
