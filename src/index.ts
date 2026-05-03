import "dotenv/config";
import http from "node:http";
import path from "node:path";

import express from "express";
import { Server } from "socket.io";
import { publisher, redis, subscriber } from "./lib/redis.js";
import { sessionMiddleware } from "./lib/session.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import { httpRateLimit } from "./middleware/rate-limit.js";

const checkbox_size = 1000000;
const checkbox_state_key = "one-million-checkboxes:checkboxes";
const rateLimitWindow = 1000;
const rateLimitMax = 10;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

const io = new Server();
io.attach(server);

app.set("trust proxy", 1);

app.use(sessionMiddleware);
app.use(httpRateLimit);

app.use("/auth", authRouter);

subscriber.subscribe("one-million-checkboxes:server:checkbox:change");
subscriber.on("message", (channel, data) => {
  if (channel === "one-million-checkboxes:server:checkbox:change") {
    const { checked, id } = JSON.parse(data);
    io.emit("server:checkbox:change", { id, checked });
  }
});

io.use((socket, next) => {
  sessionMiddleware(socket.request as any, {} as any, (err?: unknown) => {
    next(err as Error | undefined);
  });
});

io.use((socket, next) => {
  const session = socket.request.session;
  if (session?.user) {
    socket.data.user = session.user;
  }
  next();
});

io.on("connection", (socket) => {
  console.log(
    "A user connected",
    socket.id,
    socket.data.user
      ? `(authenticated as ${socket.data.user.id})`
      : "(anonymous)",
  );

  socket.on("disconnect", () => {
    rateLimits.delete(socket.id);
  });

  socket.on("client:checkbox:change", async (data) => {
    if (!socket.data.user) {
      socket.emit("auth-required");
      return;
    }

    const now = Date.now();
    const limit = rateLimits.get(socket.id);
    if (limit) {
      if (now < limit.resetAt) {
        if (limit.count >= rateLimitMax) {
          socket.emit("rate-limited", { retryAfter: limit.resetAt - now });
          return;
        }
        limit.count++;
      } else {
        limit.count = 1;
        limit.resetAt = now + rateLimitWindow;
      }
    } else {
      rateLimits.set(socket.id, { count: 1, resetAt: now + rateLimitWindow });
    }

    const index = parseInt(data.id.replace("checkbox-", "")) - 1;
    const existingState = await redis.get(checkbox_state_key);
    let remoteData;
    if (existingState) {
      remoteData = JSON.parse(existingState);
    } else {
      remoteData = new Array(checkbox_size).fill(false);
    }
    remoteData[index] = data.checked;
    await redis.set(checkbox_state_key, JSON.stringify(remoteData));
    await publisher.publish(
      "one-million-checkboxes:server:checkbox:change",
      JSON.stringify({ index, checked: data.checked, id: data.id }),
    );
  });
});

app.use(express.static(path.resolve("./src/public")));

app.get("/health", (req, res) => {
  res.json({ healthy: true });
});

app.get("/checkboxes", async (req, res) => {
  const existingState = await redis.get(checkbox_state_key);
  if (existingState) {
    const remoteData = JSON.parse(existingState);
    return res.json({ checkboxes: remoteData });
  }
  return res.json({ checkboxes: new Array(checkbox_size).fill(false) });
});

app.get("/api/protected", requireAuth, (req, res) => {
  res.json({ message: "This is a protected endpoint", user: req.session.user });
});

server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
