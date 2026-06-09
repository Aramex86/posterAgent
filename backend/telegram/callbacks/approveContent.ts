import { Context } from "grammy";
import { appGraph } from "../../graph";
import { Command } from "@langchain/langgraph";
import {
  getChatThread,
  setPendingFeedback,
} from "../../utils/telegramSessionStore";

export async function handleApproveContent(
  ctx: Context,
  threadIdFromCallback?: string,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const thread_id = threadIdFromCallback || getChatThread(chatId);

  if (!thread_id) {
    await ctx
      .answerCallbackQuery({
        text: "❌ Session expired. Please start again with /generate <url>",
      })
      .catch(() => {});
    return;
  }

  const cleanThreadId = thread_id.replace("_discuss", "");

  await ctx
    .answerCallbackQuery({ text: "✅ Approved! Generating image..." })
    .catch(() => {});
  await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
  await ctx.reply("🎨 Preparing code snippet image...");

  try {
    const config = { configurable: { thread_id: cleanThreadId } };
    await appGraph.invoke(
      new Command({ resume: { action: "approve" } }),
      config,
    );
    console.log(`🚀 Content approved for thread: ${cleanThreadId}`);
  } catch (error: any) {
    console.error(
      `❌ Failed to resume graph for thread ${cleanThreadId}:`,
      error,
    );
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}
