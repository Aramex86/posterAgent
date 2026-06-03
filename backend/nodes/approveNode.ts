import { interrupt } from "@langchain/langgraph";
import { StateType } from "../state";
import { appGraph } from "../graph";

export async function approveNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- ⏸️ ENTERING HUMAN APPROVAL GATING NODE ---");

  // 1. The graph freezes here on the initial pass and saves a checkpoint.
  // 2. The object passed to interrupt() is what gets broadcasted to your UI.
  // 3. When you call invoke(new Command({ resume: { approved: true } })) from Fastify,
  //    the runtime wakes up and populates the 'response' variable.
  const response = interrupt({
    message: "A new draft is ready for review.",
    currentDraft: state.post,
    chatHistory: state.chatHistory || [],
    chatMode: state.chatMode || false,
  }) as { approved: boolean; feedback?: string };

  console.log("--- 🚀 APPROVAL NODE RESUMED WITH HUMAN DECISION ---", response);

  // 4. Update your state channels based on the user's action.
  // Your graph's conditional edges will read these to route to 'save' or 'rewrite'.
  return {
    isApproved: response.approved,
    feedback: response.approved ? "" : response.feedback || "Needs adjustments",
    status: response.approved ? "HUMAN_APPROVED" : "HUMAN_REJECTED",
    error: null,
  };
}
