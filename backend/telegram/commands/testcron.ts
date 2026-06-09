import { Context } from "grammy";
import { env } from "../../env";
import { runDailyAnalyticsReview } from "../../utils/patternLearning";

export async function handleTestCron(ctx: Context): Promise<void> {
  const chatId = ctx?.chat?.id;
  const adminChatId = env.TELEGRAM_ADMIN_CHAT_ID
    ? Number(env.TELEGRAM_ADMIN_CHAT_ID)
    : undefined;

  if (!adminChatId || chatId !== adminChatId) {
    await ctx.reply("❌ This command is restricted to admin users only.");
    return;
  }

  await ctx.reply("🧪 Triggering daily analytics review...");

  try {
    const result = await runDailyAnalyticsReview();

    if (result.hasPending) {
      await ctx.reply(
        `📊 *Daily Analytics Review Triggered*\n\n` +
          `Summary: ${result.summary}\n\n` +
          `Proposed new writing patterns are ready for your review.\n\n` +
          `Approve to apply them to future posts.`,
        {
          parse_mode: "Markdown",
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
    } else {
      await ctx.reply(
        `📊 *Daily Analytics Review*\n\n` +
          `No pending patterns to review.\n\n` +
          `Summary: ${result.summary}`,
        { parse_mode: "Markdown" },
      );
    }
  } catch (error: any) {
    console.error("❌ /testcron failed:", error.message);
    await ctx.reply(`❌ Failed to trigger analytics review: ${error.message}`);
  }
}
