import { Router } from "express";
import {
  getAllPostsController,
  getMyPostsController,
  getPostBySlugController,
  createPostController,
  updatePostController,
  deletePostController,
  generatePostController,
  updateImageController,
} from "../controllers/post.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const RATE_LIMIT_WINDOW_HOURS = Number(process.env.RATE_LIMIT_WINDOW_HOURS) || 12;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 2;

const postRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  limit: RATE_LIMIT_MAX_REQUESTS,
  message: { error: "Too many generation requests" },
});

const router = Router();

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all published posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: List of published posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 */
router.get("/", getAllPostsController);

/**
 * @swagger
 * /posts/my:
 *   get:
 *     summary: Get all posts by logged in user including drafts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/my", requireAuth, getMyPostsController);

/**
 * @swagger
 * /posts/generate:
 *   post:
 *     summary: AI generate and save a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topic, targetKeyword]
 *             properties:
 *               topic:
 *                 type: string
 *                 example: Why TypeScript matters for backends
 *               targetKeyword:
 *                 type: string
 *                 example: typescript nodejs backend
 *               audience:
 *                 type: string
 *                 example: backend developers
 *               tone:
 *                 type: string
 *                 example: technical but approachable
 *               published:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Post generated and saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/generate", requireAuth, postRateLimiter, generatePostController);

/**
 * @swagger
 * /posts/{slug}:
 *   get:
 *     summary: Get a single post by slug
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: why-typescript-matters
 *     responses:
 *       200:
 *         description: Single post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       500:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:slug", getPostBySlugController);

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a post manually
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 example: My First Post
 *               content:
 *                 type: string
 *                 example: Markdown content here
 *               published:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", requireAuth, postRateLimiter, createPostController);

/**
 * @swagger
 * /posts/{id}:
 *   patch:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the post to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 example: Updated Post Title
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 example: Updated markdown content here
 *               published:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post updated successfully
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error — no updatable fields provided or invalid UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Post not found or not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/:id", requireAuth, postRateLimiter, updatePostController);

/**
 * @swagger
 * /posts/image/{id}:
 *   patch:
 *     summary: Regenerate and update the cover image for a post
 *     description: Generates a new AI cover image via Pollinations using the supplied title and saves the resulting URL on the post. The caller must own the post.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the post whose cover image should be regenerated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: Title used as the basis for image prompt generation
 *                 example: Why TypeScript matters for backends
 *     responses:
 *       200:
 *         description: Cover image regenerated and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Image updated successfully
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error — invalid UUID or missing/empty title
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Image generation failed or post not found/not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/image/:id", requireAuth, postRateLimiter, updateImageController);

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post
 *     description: Permanently deletes a post. The caller must be the post author.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the post to delete
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post deleted successfully
 *       400:
 *         description: Invalid UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Post not found or not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", requireAuth, deletePostController);

export default router;
