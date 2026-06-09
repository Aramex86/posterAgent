import { Context } from "grammy";
import {
  getChatThread,
  setChatThread,
  setPendingFeedback,
} from "../../utils/telegramSessionStore";

export async function handleDiscussContent(
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

  await ctx
    .answerCallbackQuery({
      text: "💬 Let's discuss! Type your question or comment.",
    })
    .catch(() => {});
  await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
  await ctx.reply(
    "📝 *Discussion Mode*\n\n" +
      "Ask me anything about the post:\n" +
      "• Why did you choose this angle?\n" +
      "• Can you make it more technical?\n" +
      "• Add a real-world example\n" +
      "• Explain the code better\n\n" +
      "Type your question or 'approve' to continue.",
    { parse_mode: "Markdown" },
  );

  setPendingFeedback(chatId, true);
  setChatThread(chatId, thread_id + "_discuss");
}
