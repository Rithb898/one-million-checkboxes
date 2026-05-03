import session from "express-session";
import { RedisStore } from "connect-redis";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";
import { redis } from "./redis.js";

const store = new RedisStore({
  client: redis,
  prefix: "sess:",
});

const rawSessionMiddleware = session({
  store,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: config.nodeEnv === "production" ? "lax" : false,
  },
});

export const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  rawSessionMiddleware(req, res, next);
};
