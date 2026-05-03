import { Router, type Request, type Response } from "express";
import type { Router as RouterType } from "express";
import {
  generateState,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  mapUserInfoToUser,
  isTokenExpired,
  refreshAccessToken,
  getLogoutUrl,
} from "../services/oidc.js";

export const authRouter: RouterType = Router();

authRouter.get("/login", async (req: Request, res: Response) => {
  try {
    const state = generateState();
    req.session.state = state;

    const authUrl = await getAuthorizationUrl(state);

    res.redirect(authUrl);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to initiate login" });
  }
});

authRouter.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    if (!state || typeof state !== "string") {
      res.status(400).json({ error: "Missing state parameter" });
      return;
    }

    if (state !== req.session.state) {
      res.status(400).json({ error: "Invalid state parameter" });
      return;
    }

    delete req.session.state;

    const tokenSet = await exchangeCodeForTokens(code);

    const userInfo = await fetchUserInfo(tokenSet.access_token);
    const user = mapUserInfoToUser(userInfo);

    req.session.user = user;
    req.session.tokenSet = tokenSet;

    res.redirect("/");
  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

authRouter.get("/me", (req: Request, res: Response) => {
  if (!req.session.user) {
    res.json({ authenticated: false, user: null });
    return;
  }

  res.json({
    authenticated: true,
    user: req.session.user,
  });
});

authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const logoutUrl = await getLogoutUrl();

    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }

      if (logoutUrl) {
        const params = new URLSearchParams({
          client_id: process.env.OIDC_CLIENT_ID ?? "",
          post_logout_redirect_uri: process.env.OIDC_REDIRECT_URI?.replace("/callback", "") ?? "",
        });
        res.redirect(`${logoutUrl}?${params.toString()}`);
      } else {
        res.json({ success: true });
      }
    });
  } catch (error) {
    console.error("Logout error:", error);
    req.session.destroy(() => {
      res.json({ success: true });
    });
  }
});

authRouter.get("/status", async (req: Request, res: Response) => {
  if (!req.session.user || !req.session.tokenSet) {
    res.json({ authenticated: false });
    return;
  }

  try {
    if (req.session.tokenSet.refresh_token && isTokenExpired(req.session.tokenSet)) {
      try {
        const newTokenSet = await refreshAccessToken(req.session.tokenSet.refresh_token);
        req.session.tokenSet = newTokenSet;
      } catch {
        req.session.destroy(() => {
          res.json({ authenticated: false, reason: "token_expired" });
        });
        return;
      }
    }

    res.json({
      authenticated: true,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.json({ authenticated: false });
  }
});
