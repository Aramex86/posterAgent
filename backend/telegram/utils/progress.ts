import { Api, RawApi } from "grammy";

export async function sendProgressMessage(
  api: Api<RawApi>,
  chatId: number,
): Promise<{ messageId: number }> {
  const msg = await api.sendMessage(
    chatId,
    "🚀 *Post Generation Progress*\n\n" +
      "⏳ Step 1/6: 🔍 Scraping source content...\n" +
      "⬜ Step 2/6: 📝 Summarizing content\n" +
      "⬜ Step 3/6: ✍️ Generating LinkedIn post\n" +
      "⬜ Step 5/6: 🎨 Generating code snippet image",
    { parse_mode: "Markdown" },
  );
  return { messageId: msg.message_id };
}

export async function updateProgress(
  api: Api<RawApi>,
  chatId: number,
  messageId: number,
  step: number,
  emoji: string,
  text: string,
): Promise<void> {
  try {
    await api.editMessageText(
      chatId,
      messageId,
      "🚀 *Post Generation Progress*\n\n" +
        `${step >= 1 ? "✅" : "⏳"} Step 1/6: 🔍 Scraping source content\n` +
        `${step >= 2 ? "✅" : "⬜"} Step 2/6: 📝 Summarizing content\n` +
        `${step >= 3 ? "✅" : "⬜"} Step 3/6: ✍️ Generating LinkedIn post\n` +
        `${step >= 5 ? "✅" : "⬜"} Step 5/6: 🎨 Generating code snippet image\n` +
        `${emoji} ${text}`,
      { parse_mode: "Markdown" },
    );
  } catch {
    // Ignore edit errors (message too old, etc.)
  }
}
