import { interrupt } from "@langchain/langgraph";
import { StateType } from "../state";

export async function approvePostingNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- ⏸️ ENTERING POSTING APPROVAL GATE ---");

  // The graph freezes here. The UI or Telegram bot must resume it.
  const response = interrupt({
    message: "Ready to post to LinkedIn?",
    postPreview: state.post,
    imageUrl: state.imageUrl,
    currentStatus: state.status,
  }) as { approved: boolean };

  console.log("--- 🚀 POSTING APPROVAL RESUMED ---", response);

  return {
    isPostingApproved: response.approved,
    status: response.approved ? "POSTING_APPROVED" : "POSTING_REJECTED",
    error: null,
  };
}
