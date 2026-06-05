import { env } from "./env";
import Fastify from "fastify";
import cors from "@fastify/cors";
// import fastifyCors from "@fastify/cors";
import fastifySSE from "@fastify/sse";
import { Cron } from "croner";
import { app } from "./app";
import { runDailyAnalyticsReview } from "./utils/patternLearning";
import { bot } from "./utils/telegramBot";

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: (origin, cb) => {
    const allowedOrigins = [
      "http://localhost:3000",
      /^https:\/\/.*\.railway\.app$/,
      /^https:\/\/.*\.up\.railway\.app$/,
    ];

    if (
      !origin ||
      allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      )
    ) {
      cb(null, true);
      return;
    }
    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
  exposedHeaders: ["Content-Type", "Connection"],
});

await fastify.register(fastifySSE);

await fastify.register(app);

// Daily analytics review cron job (08:00 UTC)
const adminChatId = env.TELEGRAM_ADMIN_CHAT_ID
  ? Number(env.TELEGRAM_ADMIN_CHAT_ID)
  : undefined;

if (adminChatId) {
  new Cron("0 8 * * *", { timezone: "UTC" }, async () => {
    console.log("⏰ Running daily analytics review...");
    try {
      const result = await runDailyAnalyticsReview();

      if (result.hasPending) {
        await bot.api.sendMessage(
          adminChatId,
          `📊 Daily Analytics Review\n\n` +
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
        console.log("📨 Sent pattern review request to admin chat");
      } else {
        console.log(
          "ℹ️ No pending patterns from daily review:",
          result.summary,
        );
      }
    } catch (error: any) {
      console.error("❌ Daily analytics review cron failed:", error.message);
      await bot.api
        .sendMessage(
          adminChatId,
          `⚠️ Daily Analytics Review Failed\n\n${error.message}`,
        )
        .catch(() => {});
    }
  });

  console.log("✅ Daily analytics review cron scheduled for 08:00 UTC");
} else {
  console.warn(
    "⚠️ TELEGRAM_ADMIN_CHAT_ID not set. Daily analytics review will not send Telegram notifications.",
  );
}

fastify.listen({ port: Number(env.PORT), host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
});
