import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5-nano"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("Claude-Haiku-3"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GEMINI_MODEL_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash-lite"),
  DEFAULT_PROVIDER: z
    .enum(["openai", "anthropic", "groq", "gemini"])
    .default("openai"),
  PORT: z.string().default("5000"),
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  CLOUDINARY_UPLOAD_PRESET: z.string().min(1, "CLOUDINARY_UPLOAD_PRESET is required"),
  // Zernio
  ZERNIO_API_KEY: z.string().optional(),
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.format());
  throw new Error("Invalid environment variables");
}

export const raw = parsed.data;

export const env = Object.freeze(parsed.data);
