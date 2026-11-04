import { CookieOptions, Response } from "express";
import { REFRESH_TTL_MS } from "./jwt.js";

export const REFRESH_COOKIE = "refreshToken";

// The cookie is only needed by /auth/refresh and /auth/logout
const cookieOptions = (): CookieOptions => {
  const sameSite = (process.env.COOKIE_SAME_SITE ?? "lax") as
    | "lax"
    | "strict"
    | "none";

  return {
    httpOnly: true,
    // SameSite=None is only accepted by browsers on secure cookies
    secure:
      sameSite === "none" ||
      (process.env.COOKIE_SECURE ?? String(process.env.NODE_ENV === "production")) === "true",
    sameSite, // "none" if frontend and backend are on different sites
    path: "/auth",
  };
};

export const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions(),
    maxAge: REFRESH_TTL_MS,
  });

export const clearRefreshCookie = (res: Response) =>
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
