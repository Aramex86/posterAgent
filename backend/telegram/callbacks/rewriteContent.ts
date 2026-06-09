import { Context } from "grammy";
import {
  getChatThread,
  setChatThread,
  setPendingFeedback,
} from "../../utils/telegramSessionStore";

export async function handleRewriteContent(
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
    .answerCallbackQuery({ text: "🔄 Please type your feedback below" })
    .catch(() => {});
  await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
  await ctx.reply(
    "📝 *Rewrite Request*\n\n" +
      "Please reply with your feedback (e.g., 'Make it punchier', 'Add a hook', 'Shorter version')",
    { parse_mode: "Markdown" },
  );

  setChatThread(chatId, cleanThreadId);
  setPendingFeedback(chatId, true);
}
