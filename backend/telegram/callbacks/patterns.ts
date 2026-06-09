import { Context } from "grammy";
import {
  approvePendingPatterns,
  rejectPendingPatterns,
  loadPendingPatterns,
} from "../../utils/patternLearning";

export async function handleApprovePatterns(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  await ctx
    .answerCallbackQuery({ text: "✅ Patterns approved!" })
    .catch(() => {});

  try {
    const pending = loadPendingPatterns();

    if (!pending) {
      await ctx.reply("⚠️ No pending pattern review found.");
      return;
    }

    approvePendingPatterns();
    await ctx.reply(
      "✅ *Pattern Review Approved*\n\n" +
        "New writing patterns have been saved and will be used for future post generation.",
      { parse_mode: "Markdown" },
    );
    console.log(`✅ Pattern review approved by chat ${chatId}`);
  } catch (error: any) {
    console.error("❌ Pattern approval callback error:", error.message);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}

export async function handleRejectPatterns(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  await ctx
    .answerCallbackQuery({ text: "❌ Patterns rejected." })
    .catch(() => {});

  try {
    const pending = loadPendingPatterns();

    if (!pending) {
      await ctx.reply("⚠️ No pending pattern review found.");
      return;
    }

    rejectPendingPatterns();
    await ctx.reply(
      "❌ *Pattern Review Rejected*\n\n" +
        "Current writing patterns remain unchanged.",
      { parse_mode: "Markdown" },
    );
    console.log(`❌ Pattern review rejected by chat ${chatId}`);
  } catch (error: any) {
    console.error("❌ Pattern rejection callback error:", error.message);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}
