import { loginUser, registerUser } from "../models/auth.model.js";
import {
  generateRefreshToken,
  hashToken,
  REFRESH_TTL_MS,
  signToken,
} from "../lib/jwt.js";
import {
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from "../lib/cookies.js";
import {
  consumeRefreshToken,
  deleteRefreshToken,
  insertRefreshToken,
} from "../db/queries/tokens.js";
import { findUserById } from "../db/queries/users.js";
import { AuthUser } from "../types/index.js";
import { Request, Response, NextFunction } from "express";

async function issueRefreshToken(userId: string) {
  const token = generateRefreshToken();
  await insertRefreshToken(
    userId,
    hashToken(token),
    new Date(Date.now() + REFRESH_TTL_MS),
  );
  return token;
}

// Issues a new access token + refresh token pair and sets the refresh cookie
async function startSession(res: Response, user: AuthUser) {
  const refreshToken = await issueRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);
  return signToken(user);
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const user = await registerUser({ email, username, password });
    const accessToken = await startSession(res, user);

    res.status(201).json({
      message: "User registered successfully",
      user,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const user = await loginUser({ email, password });
    const accessToken = await startSession(res, user);

    res.status(200).json({ message: "Login successful", user, accessToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await deleteRefreshToken(hashToken(token));

    clearRefreshCookie(res);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Rotate: the old token is deleted in the same query that looks it up,
    // so it can only be used once
    const stored = await consumeRefreshToken(hashToken(token));
    const user =
      stored && new Date(stored.expires_at) > new Date()
        ? await findUserById(stored.user_id)
        : null;

    // Not found (already rotated / revoked), expired, or user was deleted
    if (!user) {
      clearRefreshCookie(res);
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const accessToken = await startSession(res, user);

    res.json({ accessToken, user });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await findUserById(req.user!.id);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};
