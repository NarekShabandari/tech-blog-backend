import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPost } from "./helpers.js";
import type { Post } from "../types/index.js";

// ── Mock DB query layer ───────────────────────────────────────────────────────
vi.mock("../db/queries/posts.js", () => ({
  createPost: vi.fn(),
  getAllPosts: vi.fn(),
  getPostBySlug: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
}));

import {
  createPostModel,
  getAllPostsModel,
  getPostBySlugModel,
  updatePostModel,
  deletePostModel,
} from "../models/post.model.js";
import * as postsQueries from "../db/queries/posts.js";

const createPost = vi.mocked(postsQueries.createPost);
const getAllPosts = vi.mocked(postsQueries.getAllPosts);
const getPostBySlug = vi.mocked(postsQueries.getPostBySlug);
const updatePost = vi.mocked(postsQueries.updatePost);
const deletePost = vi.mocked(postsQueries.deletePost);

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe("createPostModel", () => {
  it("generates a slug from the title and calls createPost", async () => {
    createPost.mockResolvedValue(mockPost);

    const result = await createPostModel("user-uuid-1", {
      title: "Hello World",
      content: "body",
      published: true,
    });

    expect(createPost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-uuid-1",
        title: "Hello World",
        slug: "hello-world",
        content: "body",
        published: true,
      }),
    );
    expect(result).toEqual(mockPost);
  });

  it("strips special characters when generating a slug", async () => {
    createPost.mockResolvedValue(mockPost);

    await createPostModel("user-uuid-1", {
      title: "Hello, World! #1",
      content: "body",
    });

    expect(createPost).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "hello-world-1" }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getAllPostsModel", () => {
  it("fetches only published posts by default", async () => {
    getAllPosts.mockResolvedValue([mockPost]);

    const result = await getAllPostsModel();

    expect(getAllPosts).toHaveBeenCalledWith({ publishedOnly: true });
    expect(result).toEqual({ posts: [mockPost] });
  });

  it("fetches all posts when publishedOnly is false", async () => {
    getAllPosts.mockResolvedValue([mockPost]);

    const result = await getAllPostsModel(false);

    expect(getAllPosts).toHaveBeenCalledWith({ publishedOnly: false });
    expect(result).toEqual({ posts: [mockPost] });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getPostBySlugModel", () => {
  it("returns the post when found", async () => {
    getPostBySlug.mockResolvedValue(mockPost);

    const result = await getPostBySlugModel("test-post");

    expect(getPostBySlug).toHaveBeenCalledWith("test-post");
    expect(result).toEqual(mockPost);
  });

  it("throws 'Post not found' when slug does not exist", async () => {
    getPostBySlug.mockResolvedValue(null);

    await expect(getPostBySlugModel("missing-slug")).rejects.toThrow(
      "Post not found",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("updatePostModel", () => {
  it("updates the post and returns it", async () => {
    updatePost.mockResolvedValue(mockPost);

    const result = await updatePostModel("post-uuid-1", "user-uuid-1", {
      title: "Updated Title",
      content: "updated body",
    });

    expect(updatePost).toHaveBeenCalledWith(
      "post-uuid-1",
      "user-uuid-1",
      expect.objectContaining({ title: "Updated Title" }),
    );
    expect(result).toEqual(mockPost);
  });

  it("regenerates slug when title is updated", async () => {
    updatePost.mockResolvedValue(mockPost);

    await updatePostModel("post-uuid-1", "user-uuid-1", {
      title: "New Title Here",
    });

    expect(updatePost).toHaveBeenCalledWith(
      "post-uuid-1",
      "user-uuid-1",
      expect.objectContaining({ slug: "new-title-here" }),
    );
  });

  it("throws 'Post not found or not authorized' when update returns null", async () => {
    updatePost.mockResolvedValue(null as unknown as Post);

    await expect(
      updatePostModel("bad-id", "user-uuid-1", { title: "x" }),
    ).rejects.toThrow("Post not found or not authorized");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("deletePostModel", () => {
  it("resolves without error when deletion succeeds", async () => {
    deletePost.mockResolvedValue(true);

    await expect(
      deletePostModel("post-uuid-1", "user-uuid-1"),
    ).resolves.toBeUndefined();
  });

  it("throws 'Post not found or not authorized' when deletion fails", async () => {
    deletePost.mockResolvedValue(false);

    await expect(
      deletePostModel("bad-id", "user-uuid-1"),
    ).rejects.toThrow("Post not found or not authorized");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generatePostImage — tested below with its own mocks for image + updateImage
// ─────────────────────────────────────────────────────────────────────────────

// Re-declare the mocks that were already hoisted above, plus add the new ones.
// vi.mock calls are hoisted by Vitest, so we extend the existing mock factory
// by importing the module and adding spies rather than a second vi.mock call.

vi.mock("../lib/image.js", () => ({
  generateCoverImage: vi.fn(),
}));

// updateImage is part of the already-mocked posts query module — we just need
// to expose it on the existing mock object.
vi.mock("../db/queries/posts.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../db/queries/posts.js")>();
  return {
    ...original,
    createPost: vi.fn(),
    getAllPosts: vi.fn(),
    getPostBySlug: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn(),
    updateImage: vi.fn(),
  };
});

import { generatePostImage } from "../models/post.model.js";
import * as imageLib from "../lib/image.js";
import * as postsQueriesExtended from "../db/queries/posts.js";

const generateCoverImage = vi.mocked(imageLib.generateCoverImage);
const updateImageQuery = vi.mocked(postsQueriesExtended.updateImage);

// ─────────────────────────────────────────────────────────────────────────────
describe("generatePostImage", () => {
  it("calls generateCoverImage with the supplied title", async () => {
    generateCoverImage.mockResolvedValue("https://image.pollinations.ai/prompt/abc");
    updateImageQuery.mockResolvedValue(mockPost);

    await generatePostImage("post-uuid-1", "user-uuid-1", "My Blog Post");

    expect(generateCoverImage).toHaveBeenCalledOnce();
    expect(generateCoverImage).toHaveBeenCalledWith("My Blog Post");
  });

  it("calls updateImage with the generated URL, post id, and author id", async () => {
    const fakeUrl = "https://image.pollinations.ai/prompt/encoded-prompt";
    generateCoverImage.mockResolvedValue(fakeUrl);
    updateImageQuery.mockResolvedValue(mockPost);

    await generatePostImage("post-uuid-1", "user-uuid-1", "My Blog Post");

    expect(updateImageQuery).toHaveBeenCalledOnce();
    expect(updateImageQuery).toHaveBeenCalledWith("post-uuid-1", "user-uuid-1", fakeUrl);
  });

  it("returns the updated post from updateImage", async () => {
    generateCoverImage.mockResolvedValue("https://image.pollinations.ai/prompt/x");
    updateImageQuery.mockResolvedValue(mockPost);

    const result = await generatePostImage("post-uuid-1", "user-uuid-1", "Title");

    expect(result).toEqual(mockPost);
  });

  it("returns null when no post matches the id / author combination", async () => {
    generateCoverImage.mockResolvedValue("https://image.pollinations.ai/prompt/x");
    updateImageQuery.mockResolvedValue(null);

    const result = await generatePostImage("bad-id", "user-uuid-1", "Title");

    expect(result).toBeNull();
  });

  it("propagates errors thrown by generateCoverImage", async () => {
    generateCoverImage.mockRejectedValue(new Error("Prompt generation failed"));

    await expect(
      generatePostImage("post-uuid-1", "user-uuid-1", "Title"),
    ).rejects.toThrow("Prompt generation failed");
    expect(updateImageQuery).not.toHaveBeenCalled();
  });

  it("propagates errors thrown by updateImage", async () => {
    generateCoverImage.mockResolvedValue("https://image.pollinations.ai/prompt/x");
    updateImageQuery.mockRejectedValue(new Error("DB error"));

    await expect(
      generatePostImage("post-uuid-1", "user-uuid-1", "Title"),
    ).rejects.toThrow("DB error");
  });
});
