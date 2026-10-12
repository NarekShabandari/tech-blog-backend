import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildReq, buildRes, buildNext, mockPost, mockUser } from "./helpers.js";

// ── Mock the post model ───────────────────────────────────────────────────────
vi.mock("../models/post.model.js", () => ({
  getAllPostsModel: vi.fn(),
  getPostBySlugModel: vi.fn(),
  createPostModel: vi.fn(),
  updatePostModel: vi.fn(),
  deletePostModel: vi.fn(),
  generateAndSavePost: vi.fn(),
  generatePostImage: vi.fn(),
}));

// ── Mock telegram so no real HTTP calls are made ──────────────────────────────
vi.mock("../lib/telegram.js", () => ({
  sendApprovalRequest: vi.fn().mockResolvedValue(undefined),
}));

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
import * as postModel from "../models/post.model.js";

const getAllPostsModel = vi.mocked(postModel.getAllPostsModel);
const getPostBySlugModel = vi.mocked(postModel.getPostBySlugModel);
const createPostModel = vi.mocked(postModel.createPostModel);
const updatePostModel = vi.mocked(postModel.updatePostModel);
const deletePostModel = vi.mocked(postModel.deletePostModel);
const generateAndSavePost = vi.mocked(postModel.generateAndSavePost);
const generatePostImage = vi.mocked(postModel.generatePostImage);

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe("getAllPostsController", () => {
  it("returns 200 with published posts", async () => {
    getAllPostsModel.mockResolvedValue({ posts: [mockPost] });
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    await getAllPostsController(req as any, res as any, next);

    expect(getAllPostsModel).toHaveBeenCalledWith(true, undefined, undefined);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ posts: [mockPost] });
  });

  it("calls next on error", async () => {
    const error = new Error("DB error");
    getAllPostsModel.mockRejectedValue(error);

    await getAllPostsController(buildReq() as any, buildRes() as any, buildNext());
    // the next spy is the fourth argument — reconstruct cleanly
    const next = buildNext();
    getAllPostsModel.mockRejectedValue(error);
    await getAllPostsController(buildReq() as any, buildRes() as any, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getMyPostsController", () => {
  it("fetches all posts (including drafts) for the logged-in user", async () => {
    getAllPostsModel.mockResolvedValue({ posts: [mockPost] });
    const req = buildReq({ session: { user: mockUser } });
    const res = buildRes();
    const next = buildNext();

    await getMyPostsController(req as any, res as any, next);

    // called with false to include unpublished posts
    expect(getAllPostsModel).toHaveBeenCalledWith(false, undefined, undefined);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ posts: [mockPost] });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getPostBySlugController", () => {
  it("returns 200 with the post when slug matches", async () => {
    getPostBySlugModel.mockResolvedValue(mockPost);
    const req = buildReq({ params: { slug: "test-post" } });
    const res = buildRes();
    const next = buildNext();

    await getPostBySlugController(req as any, res as any, next);

    expect(getPostBySlugModel).toHaveBeenCalledWith("test-post");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ post: mockPost });
  });

  it("calls next when model throws (e.g. Post not found)", async () => {
    const error = new Error("Post not found");
    getPostBySlugModel.mockRejectedValue(error);
    const next = buildNext();

    await getPostBySlugController(
      buildReq({ params: { slug: "missing" } }) as any,
      buildRes() as any,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("createPostController", () => {
  it("returns 400 when title or content is missing", async () => {
    const req = buildReq({
      body: { content: "body" }, // missing title
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await createPostController(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Array) }),
    );
    expect(createPostModel).not.toHaveBeenCalled();
  });

  it("returns 201 with the created post", async () => {
    createPostModel.mockResolvedValue(mockPost);
    const req = buildReq({
      body: { title: "Test Post", content: "Test content body", published: true },
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await createPostController(req as any, res as any, next);

    expect(createPostModel).toHaveBeenCalledWith(mockUser.id, {
      title: "Test Post",
      content: "Test content body",
      published: true,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Post created successfully",
      post: mockPost,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("updatePostController", () => {
  it("returns 400 when no updatable fields are provided", async () => {
    const req = buildReq({
      params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
      body: {},
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await updatePostController(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Array) }),
    );
    expect(updatePostModel).not.toHaveBeenCalled();
  });

  it("returns 200 with updated post", async () => {
    updatePostModel.mockResolvedValue(mockPost);
    const req = buildReq({
      params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
      body: { title: "Updated", content: "new body" },
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await updatePostController(req as any, res as any, next);

    expect(updatePostModel).toHaveBeenCalledWith(
      "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
      mockUser.id,
      { title: "Updated", content: "new body", published: undefined },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Post updated successfully",
      post: mockPost,
    });
  });

  it("calls next on model error", async () => {
    updatePostModel.mockRejectedValue(new Error("Post not found or not authorized"));
    const next = buildNext();

    await updatePostController(
      buildReq({
        params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
        body: { title: "x" },
        session: { user: mockUser },
      }) as any,
      buildRes() as any,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("deletePostController", () => {
  it("returns 200 on successful delete", async () => {
    deletePostModel.mockResolvedValue(undefined);
    const req = buildReq({
      params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await deletePostController(req as any, res as any, next);

    expect(deletePostModel).toHaveBeenCalledWith("a1b2c3d4-e5f6-4789-abcd-ef1234567890", mockUser.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Post deleted successfully" });
  });

  it("calls next when model throws", async () => {
    deletePostModel.mockRejectedValue(new Error("Post not found or not authorized"));
    const next = buildNext();

    await deletePostController(
      buildReq({ params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" }, session: { user: mockUser } }) as any,
      buildRes() as any,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("generatePostController", () => {
  it("returns 400 with zod errors when topic is too short", async () => {
    // zod requires topic min 10 chars, targetKeyword min 3 chars
    const req = buildReq({
      body: { topic: "AI", targetKeyword: "ml" }, // both too short
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await generatePostController(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    // zod returns an array of errors, not a plain string
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Array) }),
    );
    expect(generateAndSavePost).not.toHaveBeenCalled();
  });

  it("returns 201 and sends telegram approval on success", async () => {
    generateAndSavePost.mockResolvedValue(mockPost);
    const req = buildReq({
      body: {
        topic: "AI and machine learning trends",
        targetKeyword: "machine learning",
        audience: "developers",
        tone: "informative",
      },
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await generatePostController(req as any, res as any, next);

    expect(generateAndSavePost).toHaveBeenCalledWith(
      mockUser.id,
      {
        topic: "AI and machine learning trends",
        targetKeyword: "machine learning",
        audience: "developers",
        tone: "informative",
      },
      false, // always false — published via telegram approval
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Post generated and sent for approval via Telegram",
      post: mockPost,
    });
  });

  it("calls next on error when generateAndSavePost throws", async () => {
    generateAndSavePost.mockRejectedValue(new Error("AI error"));
    const req = buildReq({
      body: {
        topic: "AI and machine learning trends",
        targetKeyword: "machine learning",
      },
      session: { user: mockUser },
    });
    const next = buildNext();

    await generatePostController(req as any, buildRes() as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("updateImageController", () => {
  it("returns 400 when id param is not a valid UUID", async () => {
    const req = buildReq({
      params: { id: "not-a-uuid" },
      body: { title: "Valid Title" },
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await updateImageController(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Array) }),
    );
    expect(generatePostImage).not.toHaveBeenCalled();
  });

  it("returns 400 when title is missing from the body", async () => {
    const req = buildReq({
      params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
      body: {},
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await updateImageController(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Array) }),
    );
    expect(generatePostImage).not.toHaveBeenCalled();
  });

  it("returns 400 when title is an empty string", async () => {
    const req = buildReq({
      params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
      body: { title: "" },
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await updateImageController(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(generatePostImage).not.toHaveBeenCalled();
  });

  it("returns 200 with the updated post on success", async () => {
    generatePostImage.mockResolvedValue(mockPost);
    const req = buildReq({
      params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
      body: { title: "A New Cover Title" },
      session: { user: mockUser },
    });
    const res = buildRes();
    const next = buildNext();

    await updateImageController(req as any, res as any, next);

    expect(generatePostImage).toHaveBeenCalledWith(
      "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
      mockUser.id,
      "A New Cover Title",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Image updated successfully",
      post: mockPost,
    });
  });

  it("calls next when generatePostImage throws", async () => {
    generatePostImage.mockRejectedValue(new Error("Image generation failed"));
    const next = buildNext();

    await updateImageController(
      buildReq({
        params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
        body: { title: "A Title" },
        session: { user: mockUser },
      }) as any,
      buildRes() as any,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("passes the session user id as authorId", async () => {
    generatePostImage.mockResolvedValue(mockPost);
    const req = buildReq({
      params: { id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890" },
      body: { title: "Title" },
      session: { user: mockUser },
    });

    await updateImageController(req as any, buildRes() as any, buildNext());

    expect(generatePostImage).toHaveBeenCalledWith(
      expect.any(String),
      mockUser.id,
      expect.any(String),
    );
  });
});
