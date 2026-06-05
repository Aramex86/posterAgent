import { appGraph } from "../graph";
import { saveToFile } from "./savePostFile";

export async function runAgent(url: string, thread_id: string) {
  const config = { configurable: { thread_id } };

  const fileName = `post_${thread_id}.json`;

  try {
    // Provide initial state with defaults for all fields
    await appGraph.invoke(
      {
        url,
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
        telegramChatId: undefined,
        isPosted: false,
        postingError: null,
        isPostingApproved: false,
      },
      config,
    );

    const snap = await appGraph.getState(config);

    const isPausedForApproval =
      snap.next && snap.next.includes("discuss");

    if (isPausedForApproval) {
      console.log(
        `⏸️ Graph paused at [discuss] for thread: ${thread_id}`,
      );

      return {
        status: "REQUIRES_APPROVAL",
        post: snap.values.post || null,
        thread_id: thread_id,
      };
    }

    if (snap.values.post) {
      await saveToFile(fileName, snap.values.post);
    }
    return {
      status: "COMPLETED",
      post: snap.values.post,
      thread_id: thread_id,
    };
  } catch (e: any) {
    console.log("Face the error", e);
  }
}
