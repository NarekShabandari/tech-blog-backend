import jwt from "jsonwebtoken";
import type { AuthUser } from "../types/index.js";
import crypto from "crypto";

const ALGORITHM = "HS256";
// Short-lived: the refresh token cookie is what keeps the session alive
const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in .env");
  return secret;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    getSecret(),
    { algorithm: ALGORITHM, expiresIn: ACCESS_TOKEN_TTL },
  );
}

export const generateRefreshToken = () =>
  crypto.randomBytes(40).toString("hex");

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, getSecret(), {
    algorithms: [ALGORITHM],
  });

  if (typeof decoded === "string" || typeof decoded.id !== "string") {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }

  return {
    id: decoded.id,
    email: decoded.email,
    username: decoded.username,
  };
}

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");
