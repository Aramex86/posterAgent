import { Context } from "grammy";
import { appGraph } from "../../graph";
import { Command } from "@langchain/langgraph";
import {
  getChatThread,
  setPendingFeedback,
} from "../../utils/telegramSessionStore";
import { escapeMarkdown } from "../utils/markdown";

export async function handleDiscussion(
  ctx: Context,
  text: string,
): Promise<void> {
  const chatId = ctx.chat.id;
  const thread_id = getChatThread(chatId);

  if (!thread_id) {
    await ctx.reply(
      "❌ Session expired. Please start again with /generate <url>",
    );
    return;
  }

  const cleanThreadId = thread_id.replace("_discuss", "");

  // Check if user wants to approve after discussion
  if (
    text.toLowerCase().includes("approve") ||
    text.toLowerCase().includes("подтверждаю") ||
    text.toLowerCase().includes("ok")
  ) {
    await ctx.reply("✅ Approved after discussion! Generating image...");
    try {
      const config = { configurable: { thread_id: cleanThreadId } };
      await appGraph.invoke(
        new Command({ resume: { action: "approve" } }),
        config,
      );
      console.log(`🚀 Approved after discussion for thread: ${cleanThreadId}`);
    } catch (error: any) {
      console.error(`❌ Error:`, error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
    return;
  }

  // Continue discussion
  await ctx.reply(`💬 Discussing: "${text}"...`);
  try {
    const config = { configurable: { thread_id: cleanThreadId } };
    await appGraph.invoke(
      new Command({ resume: { action: "discuss", message: text } }),
      config,
    );
    console.log(`💬 Discussion continued for thread: ${cleanThreadId}`);

    const snap = await appGraph.getState(config);
    const isStillDiscussing = snap.next && snap.next.includes("discuss");

    if (isStillDiscussing) {
      const feedback = snap.values.feedback || "";
      const aiMatch = feedback.match(/AI:\s*(.+)/s);
      const aiResponse = aiMatch ? aiMatch[1].trim() : null;

      if (aiResponse) {
        await ctx.api.sendMessage(
          chatId,
          `💬 *AI Response*\n\n${escapeMarkdown(aiResponse.slice(0, 2000))}${aiResponse.length > 2000 ? "..." : ""}`,
          { parse_mode: "Markdown" },
        );
      }

      await sendPostPreviewWithActions(
        ctx.api,
        chatId,
        snap.values.post,
        cleanThreadId,
      );
      setPendingFeedback(chatId, true);
    }
  } catch (error: any) {
    console.error(`❌ Discussion error:`, error);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}

async function sendPostPreviewWithActions(
  api: any,
  chatId: number,
  post: any,
  thread_id: string,
): Promise<void> {
  const postTitle = post?.postTitle || "Untitled";
  const postContent = post?.postContent || "";
  const hashtags = post?.hashtags?.join(" ") || "";

  await api.sendMessage(
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
              text: "✅ Approve",
              callback_data: `approve_content:${thread_id}`,
            },
            {
              text: "💬 Discuss",
              callback_data: `discuss_content:${thread_id}`,
            },
          ],
          [
            {
              text: "🔄 Rewrite",
              callback_data: `rewrite_content:${thread_id}`,
            },
          ],
        ],
      },
    },
  );
}
