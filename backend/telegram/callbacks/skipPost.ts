import { Context } from "grammy";
import { appGraph } from "../../graph";
import { Command } from "@langchain/langgraph";
import { getChatThread } from "../../utils/telegramSessionStore";

export async function handleSkipPost(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const thread_id = getChatThread(chatId);

  if (!thread_id) {
    await ctx
      .answerCallbackQuery({
        text: "❌ Session expired. Please start again with /generate <url>",
      })
      .catch(() => {});
    return;
  }

  await ctx.answerCallbackQuery({ text: "❌ Skipped." }).catch(() => {});

  try {
    const config = { configurable: { thread_id } };
    await appGraph.invoke(new Command({ resume: { approved: false } }), config);
    console.log(
      `🚀 Graph resumed from Telegram for thread: ${thread_id}, approved: false`,
    );
  } catch (error: any) {
    console.error(
      `❌ Failed to resume graph from Telegram for thread ${thread_id}:`,
      error,
    );
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}
