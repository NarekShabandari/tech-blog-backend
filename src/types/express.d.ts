import "express";
import type { AuthUser } from "./index.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}
