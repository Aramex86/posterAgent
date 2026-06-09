import { Context } from "grammy";
import { appGraph } from "../../graph";
import {
  setChatThread,
  setPendingFeedback,
} from "../../utils/telegramSessionStore";
import { sendProgressMessage, updateProgress } from "../utils/progress";
import { escapeMarkdown } from "../utils/markdown";

export async function handleGenerate(ctx: Context): Promise<void> {
  const messageText = ctx.message?.text || "";
  const parts = messageText.split(" ");

  if (parts.length < 2) {
    await ctx.reply(
      "? Please provide a URL.\n\nExample: /generate https://react.dev/reference/react/useActionState",
    );
    return;
  }

  const url = parts[1];
  const chatId = ctx.chat?.id;
  if (!chatId) {
    await ctx.reply("? Unable to identify chat.");
    return;
  }

  const thread_id = `telegram_${chatId}_${Date.now()}`;

  try {
    new URL(url);
  } catch {
    await ctx.reply("? Invalid URL provided. Please send a valid URL.");
    return;
  }

  await ctx.reply(`?? Starting post generation for:\n${url}`);

  setChatThread(chatId, thread_id);

  const config = { configurable: { thread_id } };
  const { messageId } = await sendProgressMessage(ctx.api, chatId);

  // Run graph streaming in background so Telegram command returns immediately
  void runGraphStream(ctx, chatId, thread_id, config, messageId, url);
}

async function runGraphStream(
  ctx: Context,
  chatId: number,
  thread_id: string,
  config: { configurable: { thread_id: string } },
  messageId: number,
  url: string,
): Promise<void> {
  try {
    const stream = await appGraph.stream(
      {
        url,
        telegramChatId: chatId,
        docs: [],
        summary: "",
        post: {} as any,
        challenge: "",
        isApproved: false,
        feedback: "",
        error: null,
        rewriteCount: 0,
        status: "initialized",
        imageUrl: "",
        telegramMessageId: undefined,
        isPosted: false,
        postingError: null,
        isPostingApproved: false,
      },
      { ...config, streamMode: "updates" },
    );

    for await (const chunk of stream) {
      for (const [nodeName] of Object.entries(chunk)) {
        console.log(`?? Telegram flow - completed node: ${nodeName}`);

        if (nodeName === "scrape") {
          await updateProgress(
            ctx.api,
            chatId,
            messageId,
            1,
            "??",
            "Scraping complete!",
          );
        } else if (nodeName === "summarize") {
          await updateProgress(
            ctx.api,
            chatId,
            messageId,
            2,
            "??",
            "Summarizing complete!",
          );
        } else if (nodeName === "generate_content") {
          await updateProgress(
            ctx.api,
            chatId,
            messageId,
            3,
            "??",
            "LinkedIn post generated!",
          );
        } else if (nodeName === "generate_image") {
          await updateProgress(
            ctx.api,
            chatId,
            messageId,
            5,
            "??",
            "Code snippet image generated!",
          );
        }
      }
    }

    const snap = await appGraph.getState(config);
    const isPausedForApproval = snap.next?.includes("approve") ?? false;
    const isPausedForDiscussion = snap.next?.includes("discuss") ?? false;

    if (isPausedForDiscussion) {
      console.log(
        `?? Telegram graph paused at discussion for thread: ${thread_id}`,
      );
      await updateProgress(
        ctx.api,
        chatId,
        messageId,
        3,
        "??",
        "Post generated! Let's discuss before approval...",
      );
      await sendPostPreview(ctx.api, chatId, snap.values.post, thread_id, true);
      setPendingFeedback(chatId, true);
      return;
    }

    if (isPausedForApproval) {
      console.log(
        `?? Telegram graph paused at content approval for thread: ${thread_id}`,
      );
      await updateProgress(
        ctx.api,
        chatId,
        messageId,
        3,
        "?",
        "Content generated! Waiting for your review...",
      );
      await sendPostPreview(
        ctx.api,
        chatId,
        snap.values.post,
        thread_id,
        false,
      );
      setPendingFeedback(chatId, true);
      return;
    }

    if (snap.next?.includes("approve_posting")) {
      console.log(
        `?? Telegram graph paused at posting approval for thread: ${thread_id}`,
      );
    }
  } catch (err: any) {
    console.error(
      `? Telegram background graph error on thread ${thread_id}:`,
      err,
    );
    await ctx.reply(`? Error generating post: ${err.message}`).catch(() => {});
  }
}

async function sendPostPreview(
  api: any,
  chatId: number,
  post: any,
  thread_id: string,
  includeDiscuss: boolean,
): Promise<void> {
  const postTitle = post?.postTitle || "Untitled";
  const postContent = post?.postContent || "";
  const hashtags = post?.hashtags?.join(" ") || "";

  const keyboard = includeDiscuss
    ? [
        [
          { text: "? Approve", callback_data: `approve_content:${thread_id}` },
          { text: "?? Discuss", callback_data: `discuss_content:${thread_id}` },
        ],
        [{ text: "?? Rewrite", callback_data: `rewrite_content:${thread_id}` }],
      ]
    : [
        [
          {
            text: "? Approve & Continue",
            callback_data: `approve_content:${thread_id}`,
          },
          { text: "?? Rewrite", callback_data: `rewrite_content:${thread_id}` },
        ],
      ];

  await api.sendMessage(
    chatId,
    `?? *Post Preview*\n\n` +
      `*${escapeMarkdown(postTitle)}*\n\n` +
      `${escapeMarkdown(postContent.slice(0, 800))}${postContent.length > 800 ? "..." : ""}\n\n` +
      `${escapeMarkdown(hashtags)}\n\n` +
      `What would you like to do?`,
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } },
  );
}
