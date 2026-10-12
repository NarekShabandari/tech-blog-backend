import pool from "../pool.js";
import { CreatePostInput, Post } from "../../types/index.js";

export const createPost = async ({
  authorId,
  title,
  slug,
  content,
  published,
  tags = [],
  title_hy = null,
  content_hy = null,
  meta_description = null,
  meta_description_hy = null,
  cover_image = null,
}: CreatePostInput): Promise<Post> => {
  const { rows } = await pool.query<Post>(
    `INSERT INTO posts (
      author_id, title, slug, content, published, tags,
      title_hy, content_hy, meta_description, meta_description_hy, cover_image
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      authorId,
      title,
      slug,
      content,
      published ?? false,
      tags,
      title_hy,
      content_hy,
      meta_description,
      meta_description_hy,
      cover_image,
    ],
  );
  return rows[0];
};

export const getAllPosts = async ({
  publishedOnly = true,
  limit,
  offset,
}: {
  publishedOnly?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Post[]> => {
  const queryParts = [
    `SELECT p.*, u.username AS author
        FROM posts p
        JOIN users u ON u.id = p.author_id`,
  ];

  if (publishedOnly) {
    queryParts.push("WHERE p.published = TRUE");
  }

  queryParts.push("ORDER BY p.created_at DESC");

  const params: any[] = [];
  if (limit !== undefined) {
    params.push(limit);
    queryParts.push(`LIMIT $${params.length}`);
  }

  if (offset !== undefined) {
    params.push(offset);
    queryParts.push(`OFFSET $${params.length}`);
  }

  const { rows } = await pool.query<Post>(queryParts.join(" "), params);
  return rows;
};

export const getPostsCount = async ({
  publishedOnly = true,
}: {
  publishedOnly?: boolean;
} = {}): Promise<number> => {
  const query = publishedOnly
    ? "SELECT COUNT(*) FROM posts WHERE published = TRUE"
    : "SELECT COUNT(*) FROM posts";

  const { rows } = await pool.query<{ count: string }>(query);
  return parseInt(rows[0].count, 10);
};

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  const { rows } = await pool.query<Post>(
    `SELECT p.*, u.username AS author
        FROM posts p
        JOIN users u ON u.id = p.author_id
        WHERE p.slug = $1`,
    [slug],
  );

  return rows[0] || null;
};

export const updatePost = async (
  id: string,
  authorId: string,
  fields: Partial<Pick<Post, "title" | "content" | "published">>,
) => {
  const { title, content, published } = fields;
  const { rows } = await pool.query<Post>(
    `UPDATE posts SET title=$1, content=$2, published=$3
    WHERE id=$4 AND author_id=$5
    RETURNING *`,
    [title, content, published, id, authorId],
  );
  return rows[0] || null;
};

export const deletePost = async (
  id: string,
  authorId: string,
): Promise<boolean> => {
  const { rowCount } = await pool.query(
    `DELETE FROM posts WHERE id=$1 AND author_id=$2`,
    [id, authorId],
  );
  return (rowCount ?? 0) > 0;
};

export const updateImage = async (
  id: string,
  authorId: string,
  cover_image: string,
): Promise<Post | null> => {
  const { rows } = await pool.query<Post>(
    `UPDATE posts SET cover_image=$1
    WHERE id=$2 AND author_id=$3
    RETURNING *`,
    [cover_image, id, authorId],
  );
  return rows[0] || null;
};
