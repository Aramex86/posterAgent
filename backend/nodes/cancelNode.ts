import { StateType } from "../state";

export async function cancelNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- ❌ SESSION CANCELLED BY USER ---");

  // Cleanup any pending Telegram message
  if (state.telegramChatId && state.telegramMessageId) {
    try {
      const { bot } = await import("../utils/telegramBot");
      await bot.api.editMessageText(
        state.telegramChatId,
        state.telegramMessageId,
        "❌ Posting cancelled by user.\n\nYou can start a new session with /generate <url>",
        { parse_mode: "Markdown" },
      );
    } catch (e: any) {
      console.warn("Failed to update Telegram message:", e.message);
    }
  }

  return {
    status: "CANCELLED",
    isPosted: false,
    isPostingApproved: false,
    postingError: null,
    error: null,
  };
}
