import { Context } from "grammy";

export async function handleMyId(ctx: Context): Promise<void> {
  const chatId = ctx.chat.id;
  await ctx.reply(
    `🆔 Your Telegram Chat ID\n\n` +
      `${chatId}\n\n` +
      `Add this to your .env as:\n` +
      `TELEGRAM_ADMIN_CHAT_ID=${chatId}`,
  );
}
