import type { Request, Response, NextFunction } from "express";
import type { SessionUser } from "../types/index.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  next();
}
