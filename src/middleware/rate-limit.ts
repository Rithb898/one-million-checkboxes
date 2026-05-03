import type { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";

type Counter = {
  count: number;
  resetAt: number;
};

const httpCounters = new Map<string, Counter>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown-ip";
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.trim() ?? req.ip ?? "unknown-ip";
  }
  return req.ip ?? "unknown-ip";
}

function cleanupExpiredCounters(now: number): void {
  for (const [key, value] of httpCounters.entries()) {
    if (value.resetAt <= now) {
      httpCounters.delete(key);
    }
  }
}

export function httpRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  cleanupExpiredCounters(now);

  const windowMs = config.rateLimit.windowMs;
  const max = config.rateLimit.maxHttp;
  const sessionKey = req.session.user?.id ?? getClientIp(req);
  const key = `http:${sessionKey}`;

  const existing = httpCounters.get(key);
  if (existing && now < existing.resetAt) {
    if (existing.count >= max) {
      res.status(429).json({
        error: "Too many requests",
        retryAfterMs: existing.resetAt - now,
      });
      return;
    }
    existing.count += 1;
    next();
    return;
  }

  httpCounters.set(key, { count: 1, resetAt: now + windowMs });
  next();
}
