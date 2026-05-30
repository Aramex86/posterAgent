import { StateType } from "../state";

export const rewriteNode = async (
  state: StateType,
): Promise<Partial<StateType>> => {
  console.log("--- ✍️ PREPARING STATE FOR CONTENT REWRITE ---");
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log(`Current user feedback to process: "${state.feedback}"`);

  // 1. We deliberately DO NOT clear state.feedback here.
  // We keep it in the state channel so the downstream 'generate_content' node
  // can inject it directly into the LLM prompt context.

  const currentCount = state.rewriteCount || 0;

  return {
    rewriteCount: currentCount + 1,
    status: "REWRITE_PREPERATION",
    isApproved: false,
    // post and feedback are naturally preserved in state channels
  };
};
