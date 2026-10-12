import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "./app.js";
import { mockPost, mockUser } from "../helpers.js";

// Disable rate limiting so tests never hit 429
vi.mock("express-rate-limit", () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

// ── Mock both models so no DB is touched ─────────────────────────────────────
vi.mock("../../models/auth.model.js", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
}));

vi.mock("../../models/post.model.js", () => ({
  getAllPostsModel: vi.fn(),
  getPostBySlugModel: vi.fn(),
  createPostModel: vi.fn(),
  updatePostModel: vi.fn(),
  deletePostModel: vi.fn(),
  generateAndSavePost: vi.fn(),
  generatePostImage: vi.fn(),
}));

// ── Mock telegram so no real HTTP calls are made ──────────────────────────────
vi.mock("../../lib/telegram.js", () => ({
  sendApprovalRequest: vi.fn().mockResolvedValue(undefined),
}));

import * as authModel from "../../models/auth.model.js";
import * as postModel from "../../models/post.model.js";

const loginUser = vi.mocked(authModel.loginUser);
const getAllPostsModel = vi.mocked(postModel.getAllPostsModel);
const getPostBySlugModel = vi.mocked(postModel.getPostBySlugModel);
const createPostModel = vi.mocked(postModel.createPostModel);
const updatePostModel = vi.mocked(postModel.updatePostModel);
const deletePostModel = vi.mocked(postModel.deletePostModel);
const generateAndSavePost = vi.mocked(postModel.generateAndSavePost);
const generatePostImage = vi.mocked(postModel.generatePostImage);

beforeEach(() => vi.clearAllMocks());

/** Returns a supertest agent that is already logged in. */
async function loggedInAgent() {
  const agent = request.agent(buildApp());
  loginUser.mockResolvedValueOnce(mockUser);
  await agent
    .post("/auth/login")
    .send({ email: "test@example.com", password: "password123" });
  return agent;
}

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /posts", () => {
  it("returns 200 with a list of published posts (no auth required)", async () => {
    getAllPostsModel.mockResolvedValue({ posts: [mockPost] });

    const res = await request(buildApp()).get("/posts");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ posts: [expect.objectContaining({ id: mockPost.id })] });
  });

  it("returns 200 with empty array when there are no posts", async () => {
    getAllPostsModel.mockResolvedValue({ posts: [] });

    const res = await request(buildApp()).get("/posts");

    expect(res.status).toBe(200);
    expect(res.body.posts).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /posts/my", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(buildApp()).get("/posts/my");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: "Not authenticated" });
  });

  it("returns 200 with all posts (including drafts) when authenticated", async () => {
    getAllPostsModel.mockResolvedValue({ posts: [mockPost] });
    const agent = await loggedInAgent();

    const res = await agent.get("/posts/my");

    expect(res.status).toBe(200);
    expect(getAllPostsModel).toHaveBeenCalledWith(false, undefined, undefined);
    expect(res.body.posts).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /posts/:slug", () => {
  it("returns 200 with the post when slug exists", async () => {
    getPostBySlugModel.mockResolvedValue(mockPost);

    const res = await request(buildApp()).get("/posts/test-post");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      post: expect.objectContaining({ slug: "test-post" }),
    });
  });

  it("returns 500 when post is not found", async () => {
    getPostBySlugModel.mockRejectedValue(new Error("Post not found"));

    const res = await request(buildApp()).get("/posts/missing-slug");

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: "Post not found" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("POST /posts", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(buildApp())
      .post("/posts")
      .send({ title: "x", content: "y" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when title or content is missing", async () => {
    const agent = await loggedInAgent();

    const res = await agent.post("/posts").send({ content: "only content" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeInstanceOf(Array);
  });

  it("returns 201 with created post", async () => {
    createPostModel.mockResolvedValue(mockPost);
    const agent = await loggedInAgent();

    const res = await agent
      .post("/posts")
      .send({ title: "Test Post", content: "Test content body", published: true });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      message: "Post created successfully",
      post: expect.objectContaining({ id: mockPost.id }),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("PATCH /posts/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(buildApp())
      .patch(`/posts/${mockPost.id}`)
      .send({ title: "new" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when no fields are provided", async () => {
    const agent = await loggedInAgent();

    const res = await agent.patch(`/posts/${mockPost.id}`).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeInstanceOf(Array);
  });

  it("returns 200 with updated post", async () => {
    updatePostModel.mockResolvedValue(mockPost);
    const agent = await loggedInAgent();

    const res = await agent
      .patch(`/posts/${mockPost.id}`)
      .send({ title: "Updated Title", content: "updated body" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: "Post updated successfully",
      post: expect.objectContaining({ id: mockPost.id }),
    });
  });

  it("returns 500 when post is not found or not authorized", async () => {
    updatePostModel.mockRejectedValue(
      new Error("Post not found or not authorized"),
    );
    const agent = await loggedInAgent();

    const res = await agent
      .patch(`/posts/${mockPost.id}`)
      .send({ title: "x", content: "y" });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: "Post not found or not authorized" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("DELETE /posts/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(buildApp()).delete(`/posts/${mockPost.id}`);

    expect(res.status).toBe(401);
  });

  it("returns 200 on successful delete", async () => {
    deletePostModel.mockResolvedValue(undefined);
    const agent = await loggedInAgent();

    const res = await agent.delete(`/posts/${mockPost.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: "Post deleted successfully" });
  });

  it("returns 500 when post is not found or not authorized", async () => {
    deletePostModel.mockRejectedValue(
      new Error("Post not found or not authorized"),
    );
    const agent = await loggedInAgent();

    const res = await agent.delete(`/posts/${mockPost.id}`);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: "Post not found or not authorized" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("POST /posts/generate", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(buildApp())
      .post("/posts/generate")
      .send({ topic: "AI and machine learning trends", targetKeyword: "machine learning" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when topic or targetKeyword fail zod validation", async () => {
    const agent = await loggedInAgent();

    // topic too short (min 10), targetKeyword too short (min 3)
    const res = await agent
      .post("/posts/generate")
      .send({ topic: "AI", targetKeyword: "ml" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeInstanceOf(Array);
  });

  it("returns 201 with the generated post", async () => {
    generateAndSavePost.mockResolvedValue(mockPost);
    const agent = await loggedInAgent();

    const res = await agent.post("/posts/generate").send({
      topic: "AI and machine learning trends",
      targetKeyword: "machine learning",
      audience: "developers",
      tone: "informative",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      message: "Post generated and sent for approval via Telegram",
      post: expect.objectContaining({ id: mockPost.id }),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("PATCH /posts/image/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(buildApp())
      .patch(`/posts/image/${mockPost.id}`)
      .send({ title: "New Cover Title" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: "Not authenticated" });
  });

  it("returns 400 when id is not a valid UUID", async () => {
    const agent = await loggedInAgent();

    const res = await agent
      .patch("/posts/image/not-a-uuid")
      .send({ title: "New Cover Title" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeInstanceOf(Array);
  });

  it("returns 400 when title is missing", async () => {
    const agent = await loggedInAgent();

    const res = await agent
      .patch(`/posts/image/${mockPost.id}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeInstanceOf(Array);
    expect(generatePostImage).not.toHaveBeenCalled();
  });

  it("returns 400 when title is an empty string", async () => {
    const agent = await loggedInAgent();

    const res = await agent
      .patch(`/posts/image/${mockPost.id}`)
      .send({ title: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeInstanceOf(Array);
  });

  it("returns 200 with updated post on success", async () => {
    generatePostImage.mockResolvedValue(mockPost);
    const agent = await loggedInAgent();

    const res = await agent
      .patch(`/posts/image/${mockPost.id}`)
      .send({ title: "New Cover Title" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: "Image updated successfully",
      post: expect.objectContaining({ id: mockPost.id }),
    });
  });

  it("returns 500 when generatePostImage throws", async () => {
    generatePostImage.mockRejectedValue(new Error("Image generation failed"));
    const agent = await loggedInAgent();

    const res = await agent
      .patch(`/posts/image/${mockPost.id}`)
      .send({ title: "New Cover Title" });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: "Image generation failed" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("DELETE /posts/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(buildApp()).delete(`/posts/${mockPost.id}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: "Not authenticated" });
  });

  it("returns 400 when id is not a valid UUID", async () => {
    const agent = await loggedInAgent();

    const res = await agent.delete("/posts/not-a-uuid");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeInstanceOf(Array);
  });

  it("returns 200 on successful delete", async () => {
    deletePostModel.mockResolvedValue(undefined);
    const agent = await loggedInAgent();

    const res = await agent.delete(`/posts/${mockPost.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: "Post deleted successfully" });
  });

  it("returns 500 when post is not found or not authorized", async () => {
    deletePostModel.mockRejectedValue(
      new Error("Post not found or not authorized"),
    );
    const agent = await loggedInAgent();

    const res = await agent.delete(`/posts/${mockPost.id}`);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: "Post not found or not authorized" });
  });
});
