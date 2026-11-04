CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id  UUID PRIMARY KEY DEFAULT  uuid_generate_v4(),
    email   VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50)    UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS posts (
    id  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id   UUID    NOT NULL    REFERENCES  users(id)   ON  DELETE   CASCADE,
    title VARCHAR(255)  NOT NULL,
    slug    VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    published   BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();