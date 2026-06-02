import { env } from "../env";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogle } from "@langchain/google";
import { ChatOllama } from "@langchain/ollama";

type Provider = "openai" | "anthropic" | "groq" | "gemini" | "ollama";

interface GetModelOptions {
  provider?: Provider;
  model?: string; // Override specific model name
  temperature?: number;
}

export async function getModel(options?: GetModelOptions) {
  const p = options?.provider ?? env.DEFAULT_PROVIDER;
  const customModel = options?.model;
  const temperature = options?.temperature ?? 0.7;

  switch (p) {
    case "openai":
      if (!env.OPENAI_API_KEY) throw new Error("❌ OPENAI_API_KEY missing");
      return new ChatOpenAI({
        model: customModel ?? env.OPENAI_MODEL,
        apiKey: env.OPENAI_API_KEY,
        temperature,
      });

    case "anthropic":
      if (!env.ANTHROPIC_API_KEY)
        throw new Error("❌ ANTHROPIC_API_KEY missing");
      return new ChatAnthropic({
        model: customModel ?? env.ANTHROPIC_MODEL,
        apiKey: env.ANTHROPIC_API_KEY,
        temperature,
      });

    case "groq":
      if (!env.GROQ_API_KEY) throw new Error("❌ GROQ_API_KEY missing");
      return new ChatGroq({
        model: customModel ?? env.GROQ_MODEL,
        apiKey: env.GROQ_API_KEY,
        temperature,
      });

    case "gemini":
      if (!env.GEMINI_MODEL_API_KEY)
        throw new Error("❌ GEMINI_MODEL_API_KEY missing");
      return new ChatGoogle({
        model: customModel ?? env.GEMINI_MODEL,
        apiKey: env.GEMINI_MODEL_API_KEY,
        temperature,
      });

    case "ollama": {
      const isCloud = env.OLLAMA_BASE_URL?.startsWith("https://");
      const headers = env.OLLAMA_API_KEY
        ? { Authorization: `Bearer ${env.OLLAMA_API_KEY}` }
        : undefined;

      if (isCloud && !env.OLLAMA_API_KEY) {
        console.warn("⚠️ Ollama Cloud used without OLLAMA_API_KEY");
      }

      return new ChatOllama({
        model: customModel ?? env.OLLAMA_MODEL,
        baseUrl: env.OLLAMA_BASE_URL,
        headers,
        format: "json",
        temperature,
      });
    }

    default:
      throw new Error(`Unknown provider: ${p}`);
  }
}
