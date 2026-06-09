import { Bot } from "grammy";
import { env } from "../env";

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// Handle 409 Conflict errors gracefully (when old deployment is still running)
bot.catch((err) => {
  const error = err.error;
  if (
    error &&
    typeof error === "object" &&
    "error_code" in error &&
    error.error_code === 409
  ) {
    console.warn(
      "⚠️ Telegram 409 Conflict: Another bot instance is running. This is normal during deployment.",
    );
    return;
  }
  console.error("❌ Telegram bot error:", err);
});
