export interface User {
  id: string;
  email: string;
  username: string;
  created_at?: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  hashedPassword: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreatePostInput {
  authorId: string;
  title: string;
  slug: string;
  content: string;
  published?: boolean;
  tags?: string[];
  title_hy?: string | null;
  content_hy?: string | null;
  meta_description?: string | null;
  meta_description_hy?: string | null;
  cover_image?: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  title_hy: string | null;
  slug: string;
  content: string;
  content_hy: string | null;
  meta_description: string | null;
  meta_description_hy: string | null;
  published: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  author?: string;
}
