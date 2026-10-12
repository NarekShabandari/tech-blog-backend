import {
  createPost,
  getAllPosts,
  getPostBySlug,
  updatePost,
  deletePost,
  updateImage,
  getPostsCount,
} from "../db/queries/posts.js";
import { generatePost } from "../lib/anthropic.js";
import { CreatePostInput, Post } from "../types/index.js";
import { translateToArmenian } from "@narekshabandari/haylog-blog-prompts/dist/translate.js";
import { PostPromptInput } from "@narekshabandari/haylog-blog-prompts/dist/buildPostPrompt.js";
import { generateCoverImage } from "../lib/image.js";

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const createPostModel = async (
  authorId: string,
  { title, content, published }: Omit<CreatePostInput, "authorId" | "slug">,
): Promise<Post> => {
  const slug = generateSlug(title);
  return await createPost({ authorId, title, slug, content, published });
};

export const getAllPostsModel = async (
  publishedOnly: boolean = true,
  page?: number,
  rows?: number,
): Promise<{
  posts: Post[];
  pagination?: {
    page: number;
    rows: number;
    total: number;
    totalPages: number;
  };
}> => {
  if (page !== undefined && rows !== undefined) {
    const offset = (page - 1) * rows;
    const [posts, total] = await Promise.all([
      getAllPosts({ publishedOnly, limit: rows, offset }),
      getPostsCount({ publishedOnly }),
    ]);

    return {
      posts,
      pagination: {
        page,
        rows,
        total,
        totalPages: Math.ceil(total / rows),
      },
    };
  }

  const posts = await getAllPosts({ publishedOnly });
  return { posts };
};

export const getPostBySlugModel = async (slug: string): Promise<Post> => {
  const post = await getPostBySlug(slug);
  if (!post) throw new Error("Post not found");
  return post;
};

export const updatePostModel = async (
  id: string,
  authorId: string,
  fields: Partial<Pick<Post, "title" | "content" | "published">>,
): Promise<Post> => {
  if (fields.title) {
    (fields as any).slug = generateSlug(fields.title);
  }

  const post = await updatePost(id, authorId, fields);
  if (!post) throw new Error("Post not found or not authorized");
  return post;
};

export const deletePostModel = async (
  id: string,
  authorId: string,
): Promise<void> => {
  const deleted = await deletePost(id, authorId);
  if (!deleted) throw new Error("Post not found or not authorized");
};

export const generateAndSavePost = async (
  authorId: string,
  input: PostPromptInput,
  published: boolean = false,
): Promise<Post> => {
  const [generated, cover_image] = await Promise.all([
    generatePost(input),
    generateCoverImage(input.topic),
  ]);

  const translated = await translateToArmenian(
    generated.title,
    generated.content,
    generated.metaDescription,
  );

  return await createPost({
    authorId,
    title: generated.title,
    slug: generated.slug,
    content: generated.content,
    published,
    tags: generated.tags,
    title_hy: translated.title_hy,
    content_hy: translated.content_hy,
    meta_description: generated.metaDescription,
    meta_description_hy: translated.meta_description_hy,
    cover_image,
  });
};

export const generatePostImage = async (
  id: string,
  authorId: string,
  title: string,
): Promise<Post | null> => {
  const cover_image = await generateCoverImage(title);
  return await updateImage(id, authorId, cover_image);
};
