import type { Session, SessionData } from "express-session";

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OidcEndpoints {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string | undefined;
}

export interface TokenSet {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string | undefined;
  id_token?: string | undefined;
  expires_at?: number | undefined;
}

export interface UserInfo {
  sub: string;
  email?: string | undefined;
  name?: string | undefined;
  preferred_username?: string | undefined;
  picture?: string | undefined;
}

export interface User {
  id: string;
  email?: string | undefined;
  name?: string | undefined;
  preferred_username?: string | undefined;
  picture?: string | undefined;
}

export interface SessionUser {
  id: string;
  email?: string | undefined;
  name?: string | undefined;
  preferred_username?: string | undefined;
  picture?: string | undefined;
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser | undefined;
    tokenSet?: TokenSet | undefined;
    state?: string | undefined;
  }
}

declare module "http" {
  interface IncomingMessage {
    session: Session & Partial<SessionData>;
    user?: SessionUser | undefined;
  }
}

import type { Socket } from "socket.io";

declare module "socket.io" {
  interface SocketData {
    user?: SessionUser | undefined;
    sessionId?: string | undefined;
  }
}
