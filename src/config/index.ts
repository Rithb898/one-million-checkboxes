import type { OidcConfig } from "../types/index.js";


export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
  oidc: {
    issuer: process.env.OIDC_ISSUER!,
    clientId: process.env.OIDC_CLIENT_ID!,
    clientSecret: process.env.OIDC_CLIENT_SECRET!,
    redirectUri: process.env.OIDC_REDIRECT_URI!,
  } satisfies OidcConfig,
  session: {
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
    maxAuthenticated: parseInt(process.env.RATE_LIMIT_MAX_AUTHENTICATED ?? "500", 10),
    maxHttp: parseInt(process.env.RATE_LIMIT_MAX_HTTP ?? "100", 10),
  },
} as const;

function validateConfig(): void {
  const required: (keyof typeof config.oidc)[] = [
    "issuer",
    "clientId",
    "clientSecret",
    "redirectUri",
  ];

  for (const key of required) {
    if (!config.oidc[key]) {
      throw new Error(`Missing required OIDC config: OIDC_${key.toUpperCase()}`);
    }
  }

  if (!config.session.secret || config.session.secret === "dev-secret-change-in-production") {
    console.warn("WARNING: Using default session secret. Set SESSION_SECRET in production.");
  }
}

validateConfig();
