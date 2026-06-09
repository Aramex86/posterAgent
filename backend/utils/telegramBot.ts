import { Bot } from "grammy";
import { env } from "../env";

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// Set bot commands menu
try {
  await bot.api.setMyCommands([
    { command: "start", description: "Start the bot and see welcome message" },
    {
      command: "generate",
      description: "Generate a LinkedIn post from URL: /generate <url>",
    },
    { command: "health", description: "Check bot health and uptime" },
    { command: "myid", description: "Get your Telegram chat ID" },
    {
      command: "testcron",
      description: "Trigger daily analytics review (admin only)",
    },
    { command: "help", description: "Show help and available commands" },
  ]);
} catch (err: any) {
  console.warn("⚠️ Failed to set bot commands:", err.message);
}

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
