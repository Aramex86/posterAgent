import { StateType } from "../state";
import { bot } from "../utils/telegramBot";

export async function telegramNotifyNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- 📱 EXECUTING TELEGRAM NOTIFICATION NODE ---");

  // If no Telegram chat ID, skip notification
  if (!state.telegramChatId) {
    console.log("⚠️ No telegramChatId found. Skipping Telegram notification.");
    return {
      status: "TELEGRAM_SKIPPED",
    };
  }

  const chatId = state.telegramChatId;

  // Build message text
  const postTitle = state.post?.postTitle || "Untitled Post";
  const content = state.post?.postContent || "";
  const challenge = state.post?.tehnicalChallange
    ? `${state.post.tehnicalChallange.title}: ${state.post.tehnicalChallange.description}`
    : "";
  const hashtags = state.post?.hashtags?.join(" ") || "";

  const messageText = `
📝 *Post Ready for LinkedIn*

*${escapeMarkdown(postTitle)}*

${escapeMarkdown(content.slice(0, 300))}${content.length > 300 ? "..." : ""}

${challenge ? `💡 *Challenge:* ${escapeMarkdown(challenge.slice(0, 100))}` : ""}

${state.imageUrl ? "📎 *Image:* [View](" + state.imageUrl + ")" : "⚠️ *No image generated*"}

${hashtags ? escapeMarkdown(hashtags) : ""}

Approve to post to LinkedIn?
  `.trim();

  try {
    // Send message with inline keyboard
    const message = await bot.api.sendMessage(chatId, messageText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Post to LinkedIn",
              callback_data: `approve_post:${state.status}`,
            },
            {
              text: "❌ Skip",
              callback_data: `skip_post:${state.status}`,
            },
          ],
        ],
      },
    });

    console.log(
      `✅ Telegram notification sent. Message ID: ${message.message_id}`,
    );

    return {
      telegramMessageId: message.message_id,
      status: "TELEGRAM_NOTIFIED",
      error: null,
    };
  } catch (error: any) {
    console.error("❌ Telegram notification failed:", error.message);
    return {
      status: "TELEGRAM_FAILED",
      error: `Telegram notification error: ${error.message}`,
    };
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
