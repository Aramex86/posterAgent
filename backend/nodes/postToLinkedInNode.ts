import { StateType } from "../state";
import { bot } from "../utils/telegramBot";
import { env } from "../env";

const ZERNIO_BASE_URL = "https://zernio.com/api/v1";

function formatPostText(post: StateType["post"]): string {
  const challengeText = post.tehnicalChallange
    ? "Challenge: " +
      post.tehnicalChallange.title +
      "\n" +
      post.tehnicalChallange.description
    : "";

  return [
    post.postTitle,
    "",
    post.postContent,
    "",
    challengeText,
    "",
    post.hashtags?.join(" ") || "",
  ]
    .join("\n")
    .trim();
}

async function simulatePost(
  state: StateType,
  formattedText: string,
): Promise<Partial<StateType>> {
  console.log("⚠️ No posting credentials found. Running simulation...");
  console.log("SIMULATED LinkedIn Post:");
  console.log("========================================");
  console.log(formattedText);
  console.log("========================================");
  if (state.imageUrl) {
    console.log("Image URL: " + state.imageUrl);
  }

  if (state.telegramChatId && state.telegramMessageId) {
    try {
      await bot.api.editMessageText(
        state.telegramChatId,
        state.telegramMessageId,
        "Simulated: Posted to LinkedIn!\n\n" +
          escapeMarkdown(state.post.postTitle) +
          "\n\n_(This was a simulation - no real post was published. Add ZERNIO_API_KEY to .env to post for real)_",
        { parse_mode: "Markdown" },
      );
    } catch (tgError: any) {
      console.warn("Failed to update Telegram message:", tgError.message);
    }
  }

  return {
    isPosted: true,
    status: "POSTED_TO_LINKEDIN_SIMULATED",
    error: null,
  };
}

async function getZernioLinkedInAccountId(): Promise<string | null> {
  if (!env.ZERNIO_API_KEY) return null;

  try {
    const res = await fetch(`${ZERNIO_BASE_URL}/accounts`, {
      headers: { Authorization: `Bearer ${env.ZERNIO_API_KEY}` },
    });

    if (!res.ok) {
      console.warn("Zernio accounts fetch failed:", res.status);
      return null;
    }

    const data = await res.json();
    const accounts = data.accounts || data.data || data;
    const linkedInAccount = (Array.isArray(accounts) ? accounts : []).find(
      (a: any) => a.platform === "linkedin" || a.platform === "linkedIn",
    );

    if (!linkedInAccount) {
      console.warn("No LinkedIn account found in Zernio");
      return null;
    }

    console.log("✅ Found Zernio LinkedIn account:", linkedInAccount._id);
    return linkedInAccount._id;
  } catch (err: any) {
    console.warn("Failed to fetch Zernio accounts:", err.message);
    return null;
  }
}

async function publishViaZernio(
  state: StateType,
  formattedText: string,
  accountId: string,
): Promise<Partial<StateType>> {
  const postBody = {
    content: formattedText,
    publishNow: true,
    platforms: [{ platform: "linkedin", accountId }],
  };

  const response = await fetch(`${ZERNIO_BASE_URL}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.ZERNIO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Zernio API error ${response.status}: ${errorData}`);
  }

  const result = await response.json();
  console.log(
    "✅ LinkedIn post published via Zernio:",
    result.post?._id || result._id,
  );

  if (state.telegramChatId && state.telegramMessageId) {
    try {
      await bot.api.editMessageText(
        state.telegramChatId,
        state.telegramMessageId,
        "✅ *Posted to LinkedIn via Zernio!*\n\n" +
          escapeMarkdown(state.post.postTitle) +
          "\n\n[View on LinkedIn](https://www.linkedin.com/feed/)",
        { parse_mode: "Markdown" },
      );
    } catch (tgError: any) {
      console.warn("Failed to update Telegram message:", tgError.message);
    }
  }

  return {
    isPosted: true,
    status: "POSTED_TO_LINKEDIN_VIA_ZERNIO",
    error: null,
  };
}

async function handlePostError(
  state: StateType,
  error: Error,
): Promise<Partial<StateType>> {
  console.error("❌ LinkedIn posting failed:", error.message);

  if (state.telegramChatId && state.telegramMessageId) {
    try {
      await bot.api.editMessageText(
        state.telegramChatId,
        state.telegramMessageId,
        "❌ *Failed to post to LinkedIn*\n\n" +
          escapeMarkdown(error.message) +
          "\n\n_Post saved but not published_",
        { parse_mode: "Markdown" },
      );
    } catch (tgError: any) {
      console.warn("Failed to update Telegram message:", tgError.message);
    }
  }

  return {
    isPosted: false,
    status: "POSTING_FAILED",
    postingError: error.message,
    error: error.message,
  };
}

export async function postToLinkedInNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- POSTING TO LINKEDIN ---");

  const formattedText = formatPostText(state.post);

  // 1. Try Zernio
  if (env.ZERNIO_API_KEY) {
    try {
      const accountId = await getZernioLinkedInAccountId();
      if (accountId) {
        return await publishViaZernio(state, formattedText, accountId);
      }
    } catch (error: any) {
      console.warn("Zernio posting failed:", error.message);
      return handlePostError(state, error);
    }
  }

  // 2. Simulation
  return simulatePost(state, formattedText);
}

function escapeMarkdown(text: string): string {
  return text
    .replaceAll("_", "\\_")
    .replaceAll("*", "\\*")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("~", "\\~")
    .replaceAll("`", "\\`")
    .replaceAll(">", "\\>")
    .replaceAll("#", "\\#")
    .replaceAll("+", "\\+");
}
