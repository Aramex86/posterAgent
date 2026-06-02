import { FastifyInstance } from "fastify";
import { webhookCallback } from "grammy";
import { bot } from "../utils/telegramBot";
import { appGraph } from "../graph";
import { Command } from "@langchain/langgraph";
import {
  setChatThread,
  getChatThread,
  setPendingFeedback,
  isPendingFeedback,
} from "../utils/telegramSessionStore";

export async function telegramBotRoute(fastify: FastifyInstance) {
  // Handle /start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "👋 Welcome to PosterAgent!\n\n" +
        "Send me a URL to generate a LinkedIn post.\n\n" +
        "Example: /generate https://react.dev/reference/react/useActionState",
    );
  });

  // Handle /generate <url> command
  bot.command("generate", async (ctx) => {
    const messageText = ctx.message?.text || "";
    const parts = messageText.split(" ");

    if (parts.length < 2) {
      await ctx.reply(
        "❌ Please provide a URL.\n\nExample: /generate https://react.dev/reference/react/useActionState",
      );
      return;
    }

    const url = parts[1];
    const chatId = ctx.chat.id;
    const thread_id = `telegram_${chatId}_${Date.now()}`;

    // Validate URL
    try {
      new URL(url);
    } catch {
      await ctx.reply("❌ Invalid URL provided. Please send a valid URL.");
      return;
    }

    await ctx.reply(`🚀 Starting post generation for:\n${url}`);

    // Store mapping so we can resume later
    setChatThread(chatId, thread_id);

    // Start the graph with telegramChatId in the initial state
    const config = { configurable: { thread_id } };

    // Send initial progress message
    const progressMsg = await ctx.reply(
      "🚀 *Post Generation Progress*\n\n" +
        "⏳ Step 1/6: 🔍 Scraping source content...\n" +
        "⬜ Step 2/6: 📝 Summarizing content\n" +
        "⬜ Step 3/6: ✍️ Generating LinkedIn post\n" +
        "⬜ Step 4/6: 💾 Saving post\n" +
        "⬜ Step 5/6: 🎨 Generating code snippet image\n" +
        "⬜ Step 6/6: ☁️ Uploading image to Cloudinary",
      { parse_mode: "Markdown" },
    );

    // Helper to update progress message
    async function updateProgress(step: number, emoji: string, text: string) {
      try {
        await bot.api.editMessageText(
          chatId,
          progressMsg.message_id,
          `🚀 *Post Generation Progress*\n\n` +
            `${step >= 1 ? "✅" : "⏳"} Step 1/6: 🔍 Scraping source content\n` +
            `${step >= 2 ? "✅" : "⬜"} Step 2/6: 📝 Summarizing content\n` +
            `${step >= 3 ? "✅" : "⬜"} Step 3/6: ✍️ Generating LinkedIn post\n` +
            `${step >= 4 ? "✅" : "⬜"} Step 4/6: 💾 Saving post\n` +
            `${step >= 5 ? "✅" : "⬜"} Step 5/6: 🎨 Generating code snippet image\n` +
            `${step >= 6 ? "✅" : "⬜"} Step 6/6: ☁️ Uploading image to Cloudinary\n\n` +
            `${emoji} ${text}`,
          { parse_mode: "Markdown" },
        );
      } catch {
        // Ignore edit errors
      }
    }

    // Launch graph with streaming to track progress
    (async () => {
      try {
        const stream = await appGraph.stream(
          {
            url,
            telegramChatId: chatId,
            docs: [],
            summary: "",
            post: {} as any,
            challenge: "",
            isApproved: false,
            feedback: "",
            error: null,
            rewriteCount: 0,
            status: "initialized",
            imageUrl: "",
            telegramMessageId: undefined,
            isPosted: false,
            postingError: null,
            isPostingApproved: false,
          },
          { ...config, streamMode: "updates" },
        );

        let currentStep = 0;
        for await (const chunk of stream) {
          for (const [nodeName] of Object.entries(chunk)) {
            console.log(`📱 Telegram flow - completed node: ${nodeName}`);

            if (nodeName === "scrape") {
              currentStep = 1;
              await updateProgress(1, "🔍", "Scraping complete!");
            } else if (nodeName === "summarize") {
              currentStep = 2;
              await updateProgress(2, "📝", "Summarizing complete!");
            } else if (nodeName === "generate_content") {
              currentStep = 3;
              await updateProgress(3, "✍️", "LinkedIn post generated!");
            } else if (nodeName === "save") {
              currentStep = 4;
              await updateProgress(4, "💾", "Post saved!");
            } else if (nodeName === "generate_image") {
              currentStep = 5;
              await updateProgress(5, "🎨", "Code snippet image generated!");
            } else if (nodeName === "upload_image") {
              currentStep = 6;
              await updateProgress(6, "☁️", "Image uploaded to Cloudinary!");
            }
          }
        }

        // Check if paused at approval
        const snap = await appGraph.getState(config);
        const isPausedForApproval = snap.next && snap.next.includes("approve");
        const isPausedForPosting =
          snap.next && snap.next.includes("approve_posting");

        if (isPausedForApproval) {
          console.log(
            `⏸️ Telegram graph paused at content approval for thread: ${thread_id}`,
          );
          await updateProgress(
            3,
            "✅",
            "Content generated! Waiting for your review...",
          );

          // Get the generated post
          const post = snap.values.post;
          const postTitle = post?.postTitle || "Untitled";
          const postContent = post?.postContent || "";
          const hashtags = post?.hashtags?.join(" ") || "";

          // Send post preview with review buttons
          await bot.api.sendMessage(
            chatId,
            `📝 *Post Preview*\n\n` +
              `*${escapeMarkdown(postTitle)}*\n\n` +
              `${escapeMarkdown(postContent.slice(0, 800))}${postContent.length > 800 ? "..." : ""}\n\n` +
              `${escapeMarkdown(hashtags)}\n\n` +
              `What would you like to do?`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Approve & Continue",
                      callback_data: `approve_content:${thread_id}`,
                    },
                    {
                      text: "🔄 Rewrite",
                      callback_data: `rewrite_content:${thread_id}`,
                    },
                  ],
                ],
              },
            },
          );

          // Mark as waiting for feedback
          setPendingFeedback(chatId, true);
          return; // Stop here, wait for user action
        }

        if (isPausedForPosting) {
          console.log(
            `⏸️ Telegram graph paused at posting approval for thread: ${thread_id}`,
          );
        }
      } catch (err: any) {
        console.error(
          `❌ Telegram background graph error on thread ${thread_id}:`,
          err,
        );
        await ctx
          .reply(`❌ Error generating post: ${err.message}`)
          .catch(() => {});
      }
    })();
  });

  // Handle callback queries (inline button clicks)
  bot.on("callback_query:data", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const chatId = ctx.chat?.id;

    if (!chatId) return;

    // Parse callback data: "approve_post:STATUS" or "skip_post:STATUS"
    const [action, threadIdFromCallback] = callbackData.split(":");

    // Handle content approval/rewrite from first gate
    if (action === "approve_content" || action === "rewrite_content") {
      const thread_id = threadIdFromCallback || getChatThread(chatId);

      if (!thread_id) {
        await ctx.answerCallbackQuery({
          text: "❌ Session expired. Please start again with /generate <url>",
        });
        return;
      }

      const approved = action === "approve_content";

      if (approved) {
        await ctx.answerCallbackQuery({
          text: "✅ Approved! Generating image...",
        });
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.reply("🎨 Preparing code snippet image...");
      } else {
        await ctx.answerCallbackQuery({
          text: "🔄 Please type your feedback below",
        });
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.reply(
          "📝 *Rewrite Request*\n\n" +
            "Please reply with your feedback (e.g., 'Make it punchier', 'Add a hook', 'Shorter version')",
          { parse_mode: "Markdown" },
        );
        setPendingFeedback(chatId, true);
        return;
      }

      // Resume the graph
      try {
        const config = { configurable: { thread_id } };
        await appGraph.invoke(
          new Command({ resume: { approved, feedback: "" } }),
          config,
        );
        console.log(`🚀 Content approved for thread: ${thread_id}`);
      } catch (error: any) {
        console.error(
          `❌ Failed to resume graph for thread ${thread_id}:`,
          error,
        );
        await ctx.reply(`❌ Error: ${error.message}`);
      }
      return;
    }

    if (action === "approve_post" || action === "skip_post") {
      const approved = action === "approve_post";
      const thread_id = getChatThread(chatId);

      if (!thread_id) {
        try {
          await ctx.answerCallbackQuery({
            text: "❌ Session expired. Please start again with /generate <url>",
          });
        } catch (e) {
          // Callback query may be expired, ignore
        }
        return;
      }

      try {
        await ctx.answerCallbackQuery({
          text: approved ? "✅ Approved!" : "❌ Skipped.",
        });
      } catch (e) {
        // Callback query may be expired, ignore
      }

      // Resume the graph
      try {
        const config = { configurable: { thread_id } };
        await appGraph.invoke(new Command({ resume: { approved } }), config);

        console.log(
          `🚀 Graph resumed from Telegram for thread: ${thread_id}, approved: ${approved}`,
        );
      } catch (error: any) {
        console.error(
          `❌ Failed to resume graph from Telegram for thread ${thread_id}:`,
          error,
        );
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    }
  });

  // Handle text messages for feedback
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    // Skip commands
    if (text.startsWith("/")) return;

    // Check if waiting for feedback
    if (!isPendingFeedback(chatId)) return;

    const thread_id = getChatThread(chatId);
    if (!thread_id) {
      await ctx.reply(
        "❌ Session expired. Please start again with /generate <url>",
      );
      return;
    }

    setPendingFeedback(chatId, false);
    await ctx.reply(`🔄 Rewriting with feedback: "${text}"...`);

    try {
      const config = { configurable: { thread_id } };
      await appGraph.invoke(
        new Command({ resume: { approved: false, feedback: text } }),
        config,
      );
      console.log(`🔄 Rewrote content for thread: ${thread_id}`);

      // After rewrite, check if paused again
      const snap = await appGraph.getState(config);
      const isPausedForApproval = snap.next && snap.next.includes("approve");

      if (isPausedForApproval) {
        const post = snap.values.post;
        const postTitle = post?.postTitle || "Untitled";
        const postContent = post?.postContent || "";
        const hashtags = post?.hashtags?.join(" ") || "";

        await bot.api.sendMessage(
          chatId,
          `📝 *Updated Post Preview*\n\n` +
            `*${escapeMarkdown(postTitle)}*\n\n` +
            `${escapeMarkdown(postContent.slice(0, 800))}${postContent.length > 800 ? "..." : ""}\n\n` +
            `${escapeMarkdown(hashtags)}\n\n` +
            `What would you like to do?`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Approve & Continue",
                    callback_data: `approve_content:${thread_id}`,
                  },
                  {
                    text: "🔄 Rewrite Again",
                    callback_data: `rewrite_content:${thread_id}`,
                  },
                ],
              ],
            },
          },
        );
        setPendingFeedback(chatId, true);
      }
    } catch (error: any) {
      console.error(`❌ Failed to rewrite for thread ${thread_id}:`, error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  // Error handler to prevent crashes
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

  // Setup webhook endpoint for Railway (no polling - avoids 409 conflicts)
  const webhookPath = "/telegram-webhook";
  fastify.post(webhookPath, webhookCallback(bot, "fastify"));
  console.log("🤖 Telegram webhook endpoint registered at", webhookPath);

  // Set webhook URL on Telegram (only in production)
  if (
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT
  ) {
    const webhookUrl = `https://posteragent-backend-production.up.railway.app${webhookPath}`;
    try {
      // Delete any existing webhook first to avoid conflicts
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      console.log("🗑️ Old webhook deleted");

      // Wait a bit for the old instance to stop
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await bot.api.setWebhook(webhookUrl);
      console.log("✅ Telegram webhook set to:", webhookUrl);
    } catch (webhookError: any) {
      console.error("❌ Failed to set webhook:", webhookError.message);
    }
  }
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`")
    .replace(/>/g, "\\>")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+");
}
