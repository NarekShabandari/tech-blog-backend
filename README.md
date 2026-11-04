# Haylog Blog Backend

A TypeScript/Express REST API for a personal blog platform. Supports JWT bearer-token auth, manual and AI-generated posts, Cloudinary image hosting, and a Telegram-based content approval workflow.

## Tech Stack

- **Runtime:** Node.js 24, TypeScript
- **Framework:** Express 4
- **Database:** PostgreSQL 16 (via `pg` / `pg-pool`)
- **Auth:** JWT bearer tokens (`jsonwebtoken`)
- **AI:** Anthropic Claude SDK + private [`@narekshabandari/haylog-blog-prompts`](https://github.com/NarekShabandari/haylog-blog-prompts) package
- **Images:** Cloudinary + Stability AI
- **Validation:** Zod
- **API Docs:** Swagger UI (`/api-docs`)
- **Testing:** Vitest + Supertest
- **Containerization:** Docker + Docker Compose

---

## Project Structure

```
src/
├── config/          # Cloudinary & Swagger setup
├── controllers/     # Request handlers (auth, posts)
├── db/
│   ├── pool.ts      # pg connection pool
│   ├── queries/     # SQL query functions
│   └── schema.sql   # Database schema
├── lib/             # Integrations (Anthropic, Cloudinary, Telegram)
├── middlewares/     # Auth token guard
├── models/          # Business logic layer
├── routes/          # Express routers
├── types/           # Shared TypeScript types
└── server.ts        # App entry point

blogPrompts/         # Private npm package — AI prompt builders
```

---

## API Endpoints

### Auth — `/auth`

| Method | Path             | Auth | Description                                |
| ------ | ---------------- | ---- | ------------------------------------------ |
| `POST` | `/auth/register` | —    | Register a new user                        |
| `POST` | `/auth/login`    | —    | Log in, returns a JWT                      |
| `POST` | `/auth/logout`   | ✓    | Logout (stateless — client discards token) |
| `GET`  | `/auth/me`       | ✓    | Return the logged-in user                  |

### Posts — `/posts`

| Method   | Path              | Auth | Description                                        |
| -------- | ----------------- | ---- | -------------------------------------------------- |
| `GET`    | `/posts`          | —    | Get all published posts                            |
| `GET`    | `/posts/my`       | ✓    | Get all posts by the logged-in user (incl. drafts) |
| `GET`    | `/posts/:slug`    | —    | Get a single post by slug                          |
| `POST`   | `/posts`          | ✓    | Create a post manually                             |
| `POST`   | `/posts/generate` | ✓    | AI-generate a post (rate limited: 1/12h)           |
| `PATCH`  | `/posts/:id`      | ✓    | Update a post                                      |
| `DELETE` | `/posts/:id`      | ✓    | Delete a post                                      |

### Other

| Method | Path                | Description                                               |
| ------ | ------------------- | --------------------------------------------------------- |
| `POST` | `/telegram/webhook` | Telegram bot callback — approve or reject generated posts |
| `GET`  | `/api-docs`         | Interactive Swagger UI                                    |

---

## AI Post Generation Flow

1. Authenticated user sends a `POST /posts/generate` request with a `topic` and `targetKeyword`.
2. The server uses Anthropic Claude (via the private `blogPrompts` package) to generate a full SEO-optimised blog post.
3. The post is saved to the database as **unpublished**.
4. A Telegram message with **Approve / Reject** inline buttons is sent to the configured chat.
5. Tapping **Approve** publishes the post. Tapping **Reject** deletes it.

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  username    VARCHAR(50)  UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Posts
CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  content     TEXT NOT NULL,
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

`updated_at` is kept current automatically via PostgreSQL triggers.

---

## Environment Variables

Copy `.env.example` (or create `.env`) with the following keys:

```env
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

# JWT (bearer-token auth)
JWT_SECRET=

# Anthropic (AI post generation)
ANTHROPIC_API_KEY=

# Stability AI (cover image generation)
STABILITY_API_KEY=

# Cloudinary (image hosting)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Telegram bot (post approval workflow)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# GitHub Packages (private blogPrompts package)
NPM_TOKEN=
```

---

## Getting Started

### Local Development

> Requires Node.js 24+ and a running PostgreSQL instance.

```bash
# Install dependencies
# Requires a valid NPM_TOKEN in your environment for the private package
npm ci

# Start in watch mode
npm run dev
```

The server starts on `http://localhost:3001` by default.

### Docker Compose

Spins up the Express backend and a PostgreSQL 16 database together. The schema is applied automatically on first run.

```bash
docker compose up --build
```

The backend is available at `http://localhost:3001`.

---

## Scripts

| Script                  | Description                    |
| ----------------------- | ------------------------------ |
| `npm run dev`           | Start with `tsx` in watch mode |
| `npm run build`         | Compile TypeScript to `dist/`  |
| `npm start`             | Run the compiled build         |
| `npm test`              | Run tests once with Vitest     |
| `npm run test:watch`    | Run tests in watch mode        |
| `npm run test:coverage` | Run tests with coverage report |

---

## CI/CD

GitHub Actions runs on every push to `main`:

1. **Test job** — installs dependencies and runs `npm test`.
2. **Deploy job** (runs only if tests pass) — SSHs into the server and runs `deploy.sh`, which pulls the latest code and rebuilds the Docker containers.

Required GitHub repository secrets:

| Secret           | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `NPM_TOKEN`      | GitHub Packages token to install the private `blogPrompts` package |
| `SERVER_IP`      | Production server IP address                                       |
| `SERVER_USER`    | SSH user on the production server                                  |
| `SERVER_SSH_KEY` | Private SSH key for the server                                     |

---

## Private Package

The `@narekshabandari/haylog-blog-prompts` package is hosted on GitHub Packages and provides the prompt-building utilities used for AI content generation (SEO post, cover image, and Armenian translation prompts). Installing it requires an `NPM_TOKEN` with `read:packages` permission.
