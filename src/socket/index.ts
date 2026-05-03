import type { Socket } from "socket.io";
import type { SessionUser } from "../types/index.js";

export function extractSessionFromHandshake(handshake: { headers: { cookie?: string }; query: Record<string, unknown> }): string | null {
  const cookieHeader = handshake.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(/connect\.sid=([^;]+)/);
  if (!match?.[1]) {
    return null;
  }

  return decodeURIComponent(match[1]);
}
