import type { Request } from "express";

const SENSITIVE_KEYS = new Set([
  "password",
  "refreshToken",
  "refresh_token",
  "accessToken",
  "access_token",
  "token",
  "temporaryPassword",
  "oldPassword",
  "newPassword",
]);

export function buildAuditContext(req: Request) {
  const userAgent = getUserAgent(req);
  return {
    ip: getClientIp(req),
    userAgent,
  };
}

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip || req.socket?.remoteAddress || undefined;
}

export function getUserAgent(req: Request): string | undefined {
  const header = req.headers["user-agent"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
}

export function sanitizeEntity(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeEntity(item));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SENSITIVE_KEYS.has(key)) {
        continue;
      }
      result[key] = sanitizeEntity(nestedValue);
    }
    return result;
  }
  return value;
}

export function normalizeJson(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

export function computeDiff(before: unknown, after: unknown): unknown {
  if (before === undefined && after === undefined) {
    return undefined;
  }
  if (before === null && after === null) {
    return null;
  }
  if (before === undefined || before === null) {
    return { added: after ?? null };
  }
  if (after === undefined || after === null) {
    return { removed: before ?? null };
  }

  const changes: Record<string, { before: unknown; after: unknown }> = {};
  const added: Record<string, unknown> = {};
  const removed: Record<string, unknown> = {};

  const walk = (prev: unknown, next: unknown, path: string) => {
    if (prev === undefined && next === undefined) {
      return;
    }
    if (prev === undefined) {
      added[path || "$"] = next;
      return;
    }
    if (next === undefined) {
      removed[path || "$"] = prev;
      return;
    }

    if (isPlainObject(prev) && isPlainObject(next)) {
      const keys = new Set([
        ...Object.keys(prev as Record<string, unknown>),
        ...Object.keys(next as Record<string, unknown>),
      ]);
      for (const key of keys) {
        const nextPath = path ? `${path}.${key}` : key;
        walk(
          (prev as Record<string, unknown>)[key],
          (next as Record<string, unknown>)[key],
          nextPath,
        );
      }
      return;
    }

    if (Array.isArray(prev) && Array.isArray(next)) {
      if (!deepEqual(prev, next)) {
        changes[path || "$"] = { before: prev, after: next };
      }
      return;
    }

    if (!deepEqual(prev, next)) {
      changes[path || "$"] = { before: prev, after: next };
    }
  };

  walk(before, after, "");

  return { changed: changes, added, removed };
}

function isPlainObject(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
