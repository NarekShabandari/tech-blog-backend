import cloudinary from "../config/cloudinary.js";
import { generateCoverImagePrompt } from "@narekshabandari/haylog-blog-prompts/dist/generateImage.js";

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

export const generateCoverImage = async (title: string): Promise<string> => {
  const prompt = await generateCoverImagePrompt(title);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      // schnell accepts at most 8 steps; the prompt limit is 2048 characters
      body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6 }),
    },
  );

  if (!res.ok) {
    throw new Error(`Cloudflare AI error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { result?: { image?: string } };
  const base64Image = data.result?.image;
  if (!base64Image) throw new Error("No image returned from Cloudflare AI");

  const uploaded = await cloudinary.uploader.upload(
    `data:image/jpeg;base64,${base64Image}`,
    {
      folder: "blog-covers",
      transformation: [
        { width: 1200, height: 630, crop: "fill" },
        { quality: "auto" },
      ],
    },
  );

  return uploaded.secure_url;
};
