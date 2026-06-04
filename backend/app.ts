import { FastifyInstance } from "fastify";
import { startAgentRoute } from "./routes/startAgentRoute.js";
import { validatePostRoute } from "./routes/validatePostRoute.js";
import { getAgentUpdatesRoute } from "./routes/getAgentupdatesRoute.js";
import { telegramBotRoute } from "./routes/telegramBotRoute.js";
import { telegramApproveRoute } from "./routes/telegramApproveRoute.js";
import { telegramPatternApproveRoute } from "./routes/telegramPatternApproveRoute.js";

export async function app(fastify: FastifyInstance) {
  // Health check endpoint for deployment platforms
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  await startAgentRoute(fastify);
  await validatePostRoute(fastify);
  await getAgentUpdatesRoute(fastify);
  await telegramBotRoute(fastify);
  await telegramApproveRoute(fastify);
  await telegramPatternApproveRoute(fastify);
}
