import { Context } from "grammy";

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    "🤖 *PosterAgent Help*\n\n" +
      "*Commands:*\n" +
      "/start — Welcome message\n" +
      "/generate <url> — Generate LinkedIn post from URL\n" +
      "/myid — Get your Telegram chat ID\n" +
      "/testcron — Trigger daily analytics review (admin only)\n" +
      "/help — Show this help\n\n" +
      "*How it works:*\n" +
      "1. Send /generate with a URL\n" +
      "2. Bot scrapes and summarizes the article\n" +
      "3. AI generates a LinkedIn post with code snippet\n" +
      "4. You approve or request rewrite\n" +
      "5. Bot posts to your LinkedIn via Zernio",
    { parse_mode: "Markdown" },
  );
}
