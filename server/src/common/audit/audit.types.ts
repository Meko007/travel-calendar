export type AuditContext = {
  ip?: string;
  userAgent?: string;
  environment?: string;
};

export type AuditLogInput = {
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  before?: unknown | null;
  after?: unknown | null;
  diff?: unknown | null;
  ip?: string | null;
  environment?: string | null;
  userAgent?: string | null;
};
