import { Api, RawApi } from "grammy";

export async function sendProgressMessage(
  api: Api<RawApi>,
  chatId: number,
): Promise<{ messageId: number }> {
  const msg = await api.sendMessage(
    chatId,
    "🚀 *Post Generation Progress*

" +
      "⏳ Step 1/6: 🔍 Scraping source content...
" +
      "⬜ Step 2/6: 📝 Summarizing content
" +
      "⬜ Step 3/6: ✍️ Generating LinkedIn post
" +
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
      "🚀 *Post Generation Progress*

" +
        `${step >= 1 ? "✅" : "⏳"} Step 1/6: 🔍 Scraping source content
` +
        `${step >= 2 ? "✅" : "⬜"} Step 2/6: 📝 Summarizing content
` +
        `${step >= 3 ? "✅" : "⬜"} Step 3/6: ✍️ Generating LinkedIn post
` +
        `${step >= 5 ? "✅" : "⬜"} Step 5/6: 🎨 Generating code snippet image
` +
        `${emoji} ${text}`,
      { parse_mode: "Markdown" },
    );
  } catch {
    // Ignore edit errors (message too old, etc.)
  }
}
