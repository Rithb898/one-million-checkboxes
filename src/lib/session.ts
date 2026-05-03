import session from "express-session";
import { RedisStore } from "connect-redis";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";
import { redis } from "./redis.js";

const redisStore = new RedisStore({
  client: redis,
  prefix: "sess:",
  disableTTL: true,
});

let isRedisStoreHealthy = true;

redis.on("ready", () => {
  isRedisStoreHealthy = true;
});

redis.on("error", (error) => {
  isRedisStoreHealthy = false;
  console.error("[session] Redis unavailable, falling back to MemoryStore:", error.message);
});

const redisSessionMiddleware = session({
  store: redisStore,
  secret: config.session.secret,
  proxy: true,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === "production" ? "auto" : false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: "lax",
  },
});

let memorySessionMiddleware: ReturnType<typeof session> | null = null;

function getMemorySessionMiddleware(): ReturnType<typeof session> {
  if (memorySessionMiddleware) return memorySessionMiddleware;

  const memoryStore = new session.MemoryStore();
  memorySessionMiddleware = session({
    store: memoryStore,
    secret: config.session.secret,
    proxy: true,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === "production" ? "auto" : false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: "lax",
    },
  });

  return memorySessionMiddleware;
}

export const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (isRedisStoreHealthy) {
    redisSessionMiddleware(req, res, next);
    return;
  }

  getMemorySessionMiddleware()(req, res, next);
};
