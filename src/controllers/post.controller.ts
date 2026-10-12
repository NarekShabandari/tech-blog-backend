import { Request, Response, NextFunction } from "express";
import {
  createPostModel,
  deletePostModel,
  getAllPostsModel,
  getPostBySlugModel,
  updatePostModel,
  generateAndSavePost,
  generatePostImage,
} from "../models/post.model.js";
import { sendApprovalRequest } from "../lib/telegram.js";

import { z } from "zod";

const generateSchema = z.object({
  topic: z.string().min(10).max(200),
  targetKeyword: z.string().min(3).max(100),
  audience: z.string().optional(),
  tone: z.string().optional(),
  published: z.boolean().optional(),
});

const slugParamSchema = z.object({
  slug: z.string().min(1),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createPostSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  published: z.boolean().optional(),
});

const updateImageSchema = z.object({
  title: z.string().min(1).max(500),
});

const paginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  rows: z.string().regex(/^\d+$/).transform(Number).optional(),
}).refine(
  (data) => (data.page !== undefined && data.rows !== undefined) || (data.page === undefined && data.rows === undefined),
  {
    message: "Both page and rows must be provided together or omitted together",
  }
);

const updatePostSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    content: z.string().min(1).optional(),
    published: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.content !== undefined ||
      data.published !== undefined,
    {
      message: "Nothing to update",
    },
  );

export const getAllPostsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const queryResult = paginationQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({ error: queryResult.error.issues });
      return;
    }

    const { page, rows } = queryResult.data;
    const result = await getAllPostsModel(true, page, rows);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyPostsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const queryResult = paginationQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({ error: queryResult.error.issues });
      return;
    }

    const { page, rows } = queryResult.data;
    const result = await getAllPostsModel(false, page, rows);
    
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getPostBySlugController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = slugParamSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }
    const { slug } = result.data;
    const post = await getPostBySlugModel(slug);
    res.status(200).json({ post });
  } catch (err) {
    next(err);
  }
};

export const createPostController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = createPostSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }
    const { title, content, published } = result.data;
    const authorId = req.session.user!.id;
    const post = await createPostModel(authorId, { title, content, published });
    res.status(201).json({ message: "Post created successfully", post });
  } catch (error) {
    next(error);
  }
};

export const updatePostController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const paramsResult = idParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ error: paramsResult.error.issues });
      return;
    }

    const bodyResult = updatePostSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: bodyResult.error.issues });
      return;
    }

    const { id } = paramsResult.data;
    const { title, content, published } = bodyResult.data;
    const authorId = req.session.user!.id;

    const post = await updatePostModel(id, authorId, {
      title,
      content,
      published,
    });
    res.status(200).json({ message: "Post updated successfully", post });
  } catch (err) {
    next(err);
  }
};
export const updateImageController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const paramsResult = idParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ error: paramsResult.error.issues });
      return;
    }
    const bodyResult = updateImageSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: bodyResult.error.issues });
      return;
    }
    const { id } = paramsResult.data;
    const { title } = bodyResult.data;
    const authorId = req.session.user!.id;
    const post = await generatePostImage(id, authorId, title);
    res.status(200).json({ message: "Image updated successfully", post });
  } catch (error) {
    next(error);
  }
};
export const deletePostController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = idParamSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }
    const { id } = result.data;
    const authorId = req.session.user!.id;

    await deletePostModel(id, authorId);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const generatePostController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = generateSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }
    const { topic, targetKeyword, audience, tone, published } = result.data;
    const authorId = req.session.user!.id;

    if (!topic || !targetKeyword) {
      res.status(400).json({ error: "topic and targetKeyword are required" });
      return;
    }

    res.setHeader("X-Status", "generating");

    const post = await generateAndSavePost(
      authorId,
      { topic, targetKeyword, audience, tone },
      false,
    );

    await sendApprovalRequest(post.id, post.title, post.slug);

    res.status(201).json({
      message: "Post generated and sent for approval via Telegram",
      post,
    });
  } catch (err) {
    next(err);
  }
};
