import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoisted mocks (must be declared before vi.mock factories) ─────────────────
const { mockFetch, mockUpload, mockGenerateCoverImagePrompt } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockUpload: vi.fn(),
  mockGenerateCoverImagePrompt: vi.fn(),
}));

// ── Mock: external prompt generator ──────────────────────────────────────────
vi.mock("@narekshabandari/haylog-blog-prompts/dist/generateImage", () => ({
  generateCoverImagePrompt: mockGenerateCoverImagePrompt,
}));

// ── Mock: Cloudinary ──────────────────────────────────────────────────────────
vi.mock("../config/cloudinary", () => ({
  default: {
    uploader: {
      upload: mockUpload,
    },
  },
}));

import { generateCoverImage } from "../lib/image.js";

const FAKE_SECURE_URL =
  "https://res.cloudinary.com/demo/image/upload/blog-covers/test.jpg";

// A realistic-looking base64 image payload returned by Cloudflare AI.
const FAKE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/ZVfAAAAAElFTkSuQmCC";

const CLOUDFLARE_URL =
  "https://api.cloudflare.com/client/v4/accounts/test-account-id/ai/run/@cf/black-forest-labs/flux-1-schnell";

// Helper: build a successful (ok) fetch Response-like object.
const makeOkResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

// Helper: build a failed (non-ok) fetch Response-like object.
const makeErrorResponse = (status: number, body: string) => ({
  ok: false,
  status,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account-id");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-api-token");

  // Default happy-path stubs
  mockFetch.mockResolvedValue(
    makeOkResponse({ result: { image: FAKE_BASE64 } }),
  );
  mockUpload.mockResolvedValue({ secure_url: FAKE_SECURE_URL });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("generateCoverImage", () => {
  // ── Happy path ──────────────────────────────────────────────────────────────

  describe("when everything succeeds", () => {
    it("returns the Cloudinary secure_url", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("a nice AI art prompt");

      const result = await generateCoverImage("My Blog Post");

      expect(typeof result).toBe("string");
      expect(result).toBe(FAKE_SECURE_URL);
    });

    it("passes the post title to generateCoverImagePrompt", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("a nice AI art prompt");

      await generateCoverImage("Deep Learning Explained");

      expect(mockGenerateCoverImagePrompt).toHaveBeenCalledOnce();
      expect(mockGenerateCoverImagePrompt).toHaveBeenCalledWith(
        "Deep Learning Explained",
      );
    });

    it("calls the Cloudflare AI endpoint with the flux-1-schnell model in the URL", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");

      await generateCoverImage("Model Check");

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(CLOUDFLARE_URL);
    });

    it("sends a POST request to Cloudflare", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");

      await generateCoverImage("Method Check");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("POST");
    });

    it("sends the Cloudflare API token as a Bearer token", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");

      await generateCoverImage("Auth Check");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer test-api-token");
    });

    it("sends a JSON content-type header", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");

      await generateCoverImage("Content-Type Check");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("passes the prompt returned by generateCoverImagePrompt in the request body", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("a custom art prompt");

      await generateCoverImage("Some Title");

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.prompt).toBe("a custom art prompt");
    });

    it("sends steps: 6 in the request body", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");

      await generateCoverImage("Steps Check");

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.steps).toBe(6);
    });

    it("slices the prompt to 2000 characters when it exceeds the limit", async () => {
      const longPrompt = "a".repeat(2500);
      mockGenerateCoverImagePrompt.mockResolvedValue(longPrompt);

      await generateCoverImage("Long Prompt");

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.prompt).toHaveLength(2000);
      expect(body.prompt).toBe(longPrompt.slice(0, 2000));
    });

    it("does not truncate prompts shorter than 2000 characters", async () => {
      const shortPrompt = "a short prompt";
      mockGenerateCoverImagePrompt.mockResolvedValue(shortPrompt);

      await generateCoverImage("Short Prompt");

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.prompt).toBe(shortPrompt);
    });

    it("uploads to Cloudinary with width=1200 and height=630", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");

      await generateCoverImage("Dimension Check");

      expect(mockUpload).toHaveBeenCalledOnce();
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transformation: expect.arrayContaining([
            expect.objectContaining({ width: 1200, height: 630 }),
          ]),
        }),
      );
    });

    it("uploads to the blog-covers folder in Cloudinary", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");

      await generateCoverImage("Folder Check");

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ folder: "blog-covers" }),
      );
    });

    it("uploads a base64 jpeg data URI (prefixed with the returned image) to Cloudinary", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");

      await generateCoverImage("Base64 Check");

      const [uploadArg] = mockUpload.mock.calls[0];
      expect(uploadArg).toBe(`data:image/jpeg;base64,${FAKE_BASE64}`);
    });

    it("calls generateCoverImagePrompt exactly once per invocation", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("prompt");

      await generateCoverImage("Once Only");

      expect(mockGenerateCoverImagePrompt).toHaveBeenCalledOnce();
    });

    it("calls fetch exactly once per invocation", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("prompt");

      await generateCoverImage("Fetch Once Only");

      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("calls cloudinary upload exactly once per invocation", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("prompt");

      await generateCoverImage("Cloudinary Once Only");

      expect(mockUpload).toHaveBeenCalledOnce();
    });
  });

  // ── Prompt generation failure ───────────────────────────────────────────────

  describe("when generateCoverImagePrompt rejects", () => {
    it("propagates the error without returning a URL", async () => {
      mockGenerateCoverImagePrompt.mockRejectedValue(
        new Error("Prompt generation failed"),
      );

      await expect(generateCoverImage("Broken Title")).rejects.toThrow(
        "Prompt generation failed",
      );
    });

    it("does not call fetch or upload when prompt generation fails", async () => {
      mockGenerateCoverImagePrompt.mockRejectedValue(new Error("LLM error"));

      await expect(generateCoverImage("Error Title")).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  // ── Cloudflare AI HTTP failure ──────────────────────────────────────────────

  describe("when Cloudflare AI responds with a non-ok status", () => {
    it("throws a Cloudflare AI error including the status code and body", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");
      mockFetch.mockResolvedValue(
        makeErrorResponse(500, "internal server error"),
      );

      await expect(generateCoverImage("Server Down")).rejects.toThrow(
        "Cloudflare AI error 500: internal server error",
      );
    });

    it("does not upload to Cloudinary when Cloudflare AI fails", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");
      mockFetch.mockResolvedValue(makeErrorResponse(503, "unavailable"));

      await expect(generateCoverImage("Unavailable")).rejects.toThrow();

      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  // ── Missing image in response ──────────────────────────────────────────────

  describe("when Cloudflare AI returns no image", () => {
    it("throws when result.image is missing", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");
      mockFetch.mockResolvedValue(makeOkResponse({ result: {} }));

      await expect(generateCoverImage("No Image")).rejects.toThrow(
        "No image returned from Cloudflare AI",
      );
    });

    it("throws when result is missing entirely", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");
      mockFetch.mockResolvedValue(makeOkResponse({}));

      await expect(generateCoverImage("No Result")).rejects.toThrow(
        "No image returned from Cloudflare AI",
      );
    });

    it("does not upload to Cloudinary when no image is returned", async () => {
      mockGenerateCoverImagePrompt.mockResolvedValue("some prompt");
      mockFetch.mockResolvedValue(makeOkResponse({ result: {} }));

      await expect(generateCoverImage("No Upload")).rejects.toThrow();

      expect(mockUpload).not.toHaveBeenCalled();
    });
  });
});
