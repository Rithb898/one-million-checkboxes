import * as jose from "jose";
import { config } from "../config/index.js";
import type { OidcEndpoints, TokenSet, UserInfo, User } from "../types/index.js";

let cachedEndpoints: OidcEndpoints | null = null;
let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

export async function discoverEndpoints(): Promise<OidcEndpoints> {
  if (cachedEndpoints) {
    return cachedEndpoints;
  }

  const wellKnownUrl = `${config.oidc.issuer}/.well-known/openid-configuration`;

  const response = await fetch(wellKnownUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC configuration: ${response.status}`);
  }

  const config_response = await response.json() as Record<string, unknown>;

  const endpoints: OidcEndpoints = {
    authorization_endpoint: config_response.authorization_endpoint as string,
    token_endpoint: config_response.token_endpoint as string,
    userinfo_endpoint: config_response.userinfo_endpoint as string,
    jwks_uri: config_response.jwks_uri as string,
    end_session_endpoint: config_response.end_session_endpoint as string | undefined,
  };

  cachedEndpoints = endpoints;

  return cachedEndpoints;
}

export async function getJwks(): Promise<ReturnType<typeof jose.createRemoteJWKSet>> {
  if (cachedJwks) {
    return cachedJwks;
  }

  const endpoints = await discoverEndpoints();
  cachedJwks = jose.createRemoteJWKSet(new URL(endpoints.jwks_uri));

  return cachedJwks;
}

export function generateState(): string {
  return crypto.randomUUID();
}

export function getAuthorizationUrl(state: string): Promise<string> {
  return discoverEndpoints().then((endpoints) => {
    const params = new URLSearchParams({
      client_id: config.oidc.clientId,
      redirect_uri: config.oidc.redirectUri,
      response_type: "code",
      scope: "openid profile email",
      state,
    });

    return `${endpoints.authorization_endpoint}?${params.toString()}`;
  });
}

export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  const endpoints = await discoverEndpoints();

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.oidc.redirectUri,
    client_id: config.oidc.clientId,
    client_secret: config.oidc.clientSecret,
  });

  const response = await fetch(endpoints.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${response.status} - ${errorText}`);
  }

  const tokenResponse = await response.json() as Record<string, unknown>;

  const tokenSet: TokenSet = {
    access_token: tokenResponse.access_token as string,
    token_type: tokenResponse.token_type as string,
    expires_in: tokenResponse.expires_in as number,
    refresh_token: tokenResponse.refresh_token as string | undefined,
    id_token: tokenResponse.id_token as string | undefined,
    expires_at: Math.floor(Date.now() / 1000) + (tokenResponse.expires_in as number),
  };

  return tokenSet;
}

export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const endpoints = await discoverEndpoints();

  const response = await fetch(endpoints.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  return response.json() as Promise<UserInfo>;
}

export async function verifyIdToken(idToken: string): Promise<jose.JWTVerifyResult> {
  const jwks = await getJwks();

  return await jose.jwtVerify(idToken, jwks, {
    issuer: config.oidc.issuer,
    audience: config.oidc.clientId,
  });
}

export function mapUserInfoToUser(userInfo: UserInfo): User {
  return {
    id: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name,
    preferred_username: userInfo.preferred_username,
    picture: userInfo.picture,
  };
}

export function isTokenExpired(tokenSet: TokenSet): boolean {
  if (!tokenSet.expires_at) {
    return false;
  }
  return tokenSet.expires_at < Math.floor(Date.now() / 1000) + 60;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const endpoints = await discoverEndpoints();

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.oidc.clientId,
    client_secret: config.oidc.clientSecret,
  });

  const response = await fetch(endpoints.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
  }

  const tokenResponse = await response.json() as Record<string, unknown>;

  return {
    access_token: tokenResponse.access_token as string,
    token_type: tokenResponse.token_type as string,
    expires_in: tokenResponse.expires_in as number,
    refresh_token: (tokenResponse.refresh_token as string) ?? refreshToken,
    id_token: tokenResponse.id_token as string | undefined,
    expires_at: Math.floor(Date.now() / 1000) + (tokenResponse.expires_in as number),
  };
}

export async function getLogoutUrl(): Promise<string | null> {
  const endpoints = await discoverEndpoints();
  return endpoints.end_session_endpoint ?? null;
}
