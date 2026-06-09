import { Context } from "grammy";
import { appGraph } from "../../graph";
import { Command } from "@langchain/langgraph";
import {
  getChatThread,
  setPendingFeedback,
} from "../../utils/telegramSessionStore";
import { escapeMarkdown } from "../utils/markdown";

export async function handleRewrite(ctx: Context, text: string): Promise<void> {
  const chatId = ctx.chat.id;
  const thread_id = getChatThread(chatId);

  if (!thread_id) {
    await ctx.reply(
      "❌ Session expired. Please start again with /generate <url>",
    );
    return;
  }

  const cleanThreadId = thread_id.replace("_discuss", "");

  setPendingFeedback(chatId, false);
  await ctx.reply(`🔄 Rewriting with feedback: "${text}"...`);

  try {
    const config = { configurable: { thread_id: cleanThreadId } };
    await appGraph.invoke(
      new Command({ resume: { action: "rewrite", message: text } }),
      config,
    );
    console.log(`🔄 Rewrote content for thread: ${cleanThreadId}`);

    const snap = await appGraph.getState(config);
    const isPausedForDiscussion = snap.next && snap.next.includes("discuss");

    if (isPausedForDiscussion) {
      const post = snap.values.post;
      const postTitle = post?.postTitle || "Untitled";
      const postContent = post?.postContent || "";
      const hashtags = post?.hashtags?.join(" ") || "";

      await ctx.api.sendMessage(
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
                  text: "✅ Approve",
                  callback_data: `approve_content:${cleanThreadId}`,
                },
                {
                  text: "💬 Discuss",
                  callback_data: `discuss_content:${cleanThreadId}`,
                },
              ],
              [
                {
                  text: "🔄 Rewrite",
                  callback_data: `rewrite_content:${cleanThreadId}`,
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
}
