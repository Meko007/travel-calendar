import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import type { AuditContext, AuditLogInput } from './audit.types';
import { computeDiff, normalizeJson, sanitizeEntity } from './audit.utils';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: DbService) {}

  async log(input: AuditLogInput, context?: AuditContext) {
    const sanitizedBefore = sanitizeEntity(input.before);
    const sanitizedAfter = sanitizeEntity(input.after);

    const beforeValue =
      sanitizedBefore === undefined ? null : normalizeJson(sanitizedBefore);
    const afterValue =
      sanitizedAfter === undefined ? null : normalizeJson(sanitizedAfter);

    const diffValue =
      input.diff === undefined ? computeDiff(beforeValue, afterValue) : input.diff;
    const normalizedDiff = diffValue === undefined ? null : normalizeJson(diffValue);

    return this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        action: input.action,
        before: beforeValue as any,
        after: afterValue as any,
        diff: normalizedDiff as any,
        ip: input.ip ?? context?.ip ?? null,
        userAgent: input.userAgent ?? context?.userAgent ?? null,
      },
    });
  }
}
