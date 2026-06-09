import { FastifyInstance } from "fastify";
import { webhookCallback } from "grammy";
import { bot } from "../utils/telegramBot";

import { handleStart } from "./commands/start";
import { handleHelp } from "./commands/help";
import { handleHealth } from "./commands/health";
import { handleTestCron } from "./commands/testcron";
import { handleGenerate } from "./commands/generate";
import { handleMyId } from "./commands/myid";

import { handleApproveContent } from "./callbacks/approveContent";
import { handleRewriteContent } from "./callbacks/rewriteContent";
import { handleDiscussContent } from "./callbacks/discussContent";
import { handleApprovePost } from "./callbacks/approvePost";
import { handleSkipPost } from "./callbacks/skipPost";
import {
  handleApprovePatterns,
  handleRejectPatterns,
} from "./callbacks/patterns";

import { handleDiscussion } from "./text/discussion";
import { handleRewrite } from "./text/rewrite";

import {
  isPendingFeedback,
  getChatThread,
} from "../utils/telegramSessionStore";

export function registerTelegramBot(fastify: FastifyInstance): void {
  // Commands
  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("health", handleHealth);
  bot.command("myid", handleMyId);
  bot.command("testcron", handleTestCron);
  bot.command("generate", handleGenerate);

  // Callback queries
  bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const [action, threadIdFromCallback] = callbackData.split(":");

    switch (action) {
      case "approve_content":
        await handleApproveContent(ctx, threadIdFromCallback);
        break;
      case "rewrite_content":
        await handleRewriteContent(ctx, threadIdFromCallback);
        break;
      case "discuss_content":
        await handleDiscussContent(ctx, threadIdFromCallback);
        break;
      case "approve_post":
        await handleApprovePost(ctx);
        break;
      case "skip_post":
        await handleSkipPost(ctx);
        break;
      case "approve_patterns":
        await handleApprovePatterns(ctx);
        break;
      case "reject_patterns":
        await handleRejectPatterns(ctx);
        break;
      default:
        console.warn(`⚠️ Unknown callback action: ${action}`);
    }
  });

  // Text messages (feedback / discussion)
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    if (text.startsWith("/")) return;
    if (!isPendingFeedback(chatId)) return;

    const thread_id = getChatThread(chatId);
    if (!thread_id) {
      await ctx.reply(
        "❌ Session expired. Please start again with /generate <url>",
      );
      return;
    }

    const isDiscussion = thread_id.endsWith("_discuss");

    if (isDiscussion) {
      await handleDiscussion(ctx, text);
    } else {
      await handleRewrite(ctx, text);
    }
  });

  // Error handler
  bot.catch((err) => {
    const error = err.error;
    if (
      error &&
      typeof error === "object" &&
      "error_code" in error &&
      error.error_code === 409
    ) {
      console.warn(
        "⚠️ Telegram 409 Conflict: Another bot instance is running. This is normal during deployment.",
      );
      return;
    }
    console.error("❌ Telegram bot error:", err);
  });

  // Webhook
  const webhookPath = "/telegram-webhook";
  fastify.post(webhookPath, webhookCallback(bot, "fastify"));
  console.log("🤖 Telegram webhook endpoint registered at", webhookPath);

  // Set webhook in production
  if (
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT
  ) {
    const webhookUrl = `https://posteragent-backend-production.up.railway.app${webhookPath}`;
    (async () => {
      try {
        await bot.api.deleteWebhook({ drop_pending_updates: true });
        console.log("🗑️ Old webhook deleted");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await bot.api.setWebhook(webhookUrl);
        console.log("✅ Telegram webhook set to:", webhookUrl);
      } catch (webhookError: any) {
        console.error("❌ Failed to set webhook:", webhookError.message);
      }
    })();
  }
}
