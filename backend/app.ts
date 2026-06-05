import { FastifyInstance } from "fastify";
import { startAgentRoute } from "./routes/startAgentRoute.js";
import { validatePostRoute } from "./routes/validatePostRoute.js";
import { getAgentUpdatesRoute } from "./routes/getAgentupdatesRoute.js";
import { telegramBotRoute } from "./routes/telegramBotRoute.js";
import { telegramApproveRoute } from "./routes/telegramApproveRoute.js";
import { telegramPatternApproveRoute } from "./routes/telegramPatternApproveRoute.js";
import { runDailyAnalyticsReview } from "./utils/patternLearning.js";
import { bot } from "./utils/telegramBot.js";
import { env } from "./env.js";

export async function app(fastify: FastifyInstance) {
  // Health check endpoint for deployment platforms
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Test endpoint to manually trigger daily analytics review
  fastify.get("/test-cron", async (request, reply) => {
    const adminChatId = env.TELEGRAM_ADMIN_CHAT_ID
      ? Number(env.TELEGRAM_ADMIN_CHAT_ID)
      : undefined;

    if (!adminChatId) {
      return reply.code(400).send({
        error: "TELEGRAM_ADMIN_CHAT_ID not set",
      });
    }

    console.log("🧪 Manual cron trigger requested");
    try {
      const result = await runDailyAnalyticsReview();

      if (result.hasPending) {
        await bot.api.sendMessage(
          adminChatId,
          `📊 Daily Analytics Review (TEST)\n\n` +
            `Summary: ${result.summary}\n\n` +
            `Proposed new writing patterns are ready for your review.\n\n` +
            `Approve to apply them to future posts.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Approve Patterns",
                    callback_data: "approve_patterns",
                  },
                  {
                    text: "❌ Reject Patterns",
                    callback_data: "reject_patterns",
                  },
                ],
              ],
            },
          },
        );
        console.log("📨 Sent test pattern review request to admin chat");
      }

      return {
        success: true,
        hasPending: result.hasPending,
        summary: result.summary,
        sentTo: adminChatId,
      };
    } catch (error: any) {
      console.error("❌ Test cron failed:", error.message);
      return reply.code(500).send({
        error: error.message,
      });
    }
  });

  await startAgentRoute(fastify);
  await validatePostRoute(fastify);
  await getAgentUpdatesRoute(fastify);
  await telegramBotRoute(fastify);
  await telegramApproveRoute(fastify);
  await telegramPatternApproveRoute(fastify);
}
