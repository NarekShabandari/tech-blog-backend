import { Router } from "express";
import {
  register,
  login,
  logout,
  me,
  refreshToken,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

// Slows down password guessing on login/register
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many attempts, please try again later" },
});

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               username:
 *                 type: string
 *                 example: devuser
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                   description: Short-lived JWT to send as Authorization Bearer token. A refresh token is also set as an httpOnly cookie.
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/register", authRateLimiter, register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in and start a session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful — returns a Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                   description: Short-lived JWT to send as Authorization Bearer token. A refresh token is also set as an httpOnly cookie.
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", authRateLimiter, login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out and end session
 *     description: Revokes the refresh token from the cookie and clears the cookie.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/logout", logout);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Get a new access token
 *     description: Uses the httpOnly refreshToken cookie to issue a new access token. The refresh token is rotated (single-use) and a new cookie is set.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Short-lived JWT to send as Authorization Bearer token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Missing, expired, or already used refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/refresh", refreshToken);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     description: Returns the user identified by the supplied Bearer token.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: No active session — user is not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Unauthorized
 */
router.get("/me", requireAuth, me);

export default router;
