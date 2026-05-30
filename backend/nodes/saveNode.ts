// nodes/save_node.ts
import { StateType } from "../state";
import { saveToFile } from "../utils/savePostFile";

export async function saveNode(state: StateType): Promise<Partial<StateType>> {
  console.log("--- 💾 EXECUTING FINAL SAVE NODE ---");

  // 1. Guard check to make sure there is a post to save
  if (!state.post) {
    console.error("❌ Save node executed, but state.post is empty.");
    return {
      status: "SAVE_FAILED",
      error: "No post content available to save.",
    };
  }

  try {
    // 2. Derive a predictable file name from the state history or routing payload
    // If you don't track thread_id directly inside state channels, you can look it up
    // or use a safe timestamp slug. Alternatively, keep it uniform:
    const timestamp = Date.now();
    const safeTitle = state.post.postTitle
      ? state.post.postTitle
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")
          .slice(0, 30)
      : "generated_post";

    const fileName = `final_post_${safeTitle}_${timestamp}.json`;

    // 3. Persist the final approved output to the file system
    await saveToFile(fileName, state.post);
    console.log(
      `✅ Successfully saved final approved post to disk: ${fileName}`,
    );

    // 4. Update the state matching your exact Annotation channels
    return {
      status: "save_complete", // Matches your diagram's ending point status
      error: null,
    };
  } catch (error: any) {
    console.error("❌ Failed to write post data inside saveNode:", error);
    return {
      status: "SAVE_FAILED",
      error: `FileSystem Save Error: ${error.message}`,
    };
  }
}
