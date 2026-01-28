import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../common/db/db.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction, AuditEntity } from '../common/audit/audit.constants';
import type { AuditContext } from '../common/audit/audit.types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: DbService,
    private readonly audit: AuditService,
  ) {}

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

  async markRead(id: string, userId: string, context?: AuditContext) {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    await this.audit.log({
      userId,
      entityType: AuditEntity.NOTIFICATION,
      entityId: updated.id,
      action: AuditAction.NOTIFICATION_READ,
      before: existing,
      after: updated,
    }, context);

    return updated;
  }
}
