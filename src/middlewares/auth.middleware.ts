import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    req.user = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Not authenticated" });
  }

  next();
};
