import { StateType } from "../state";
import { OutputSchema } from "../types/generate_content_type";
import { getModel } from "../utils/model";

export async function generateContentNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- GENERATING POST AND CHALLENGE ---");

  // Determine if this is a fresh run or a loop back from human revision
  const isRewriteRun = state.feedback && state.feedback.trim() !== "";

  const system_message = `
You are an expert React Developer and a popular tech blogger. Your job is to create high-performing LinkedIn posts that teach technical concepts clearly.

CRITICAL INSTRUCTIONS:
1. Write an engaging LinkedIn post with a strong hook-style headline.
2. Explain the React concept/hook in simple, plain terms.
3. Include a minimal, practical code example using valid JSX syntax.
4. Keep the text layout highly scannable (short sentences, clear spacing). Do not use emojis unless explicitly requested.
5. Create a thought-provoking, brief "Challenge" (practical exercise) at the end to reinforce the material.
6. Return your final answer strictly structured matching the required output schema.
  `.trim();

  // 2. Dynamic runtime context isolated using XML-style data tags
  let userPrompt = `
<source_summary>
${state.summary}
</source_summary>
  `.trim();

  if (isRewriteRun) {
    userPrompt += `\n\n
⚠️ CRITICAL REVISION REQUIRED ⚠️
The user rejected your previous draft. You must completely overhaul or adjust the content based on the feedback below.

<human_feedback>
${state.feedback}
</human_feedback>

<previous_draft>
Title: ${state.post?.postTitle || ""}
Content: ${state.post?.postContent || ""}
</previous_draft>

Ensure the new output strictly addresses the issues outlined in <human_feedback> while preserving the core React lessons.
    `.trim();
  }

  try {
    const contentGeneratorAgent = await getModel();
    const structuredModel =
      contentGeneratorAgent.withStructuredOutput(OutputSchema);

    const response = await structuredModel.invoke([
      { role: "system", content: system_message },
      { role: "user", content: userPrompt },
    ]);

    return {
      post: { ...response },
      error: null,
      rewriteCount: state.rewriteCount || 0,
      feedback: "",
      isApproved: false,
      status: isRewriteRun ? "REWRITE_COMPLETE" : "GENERATION_COMPLETE",
    };
  } catch (e: any) {
    console.error("❌ Error inside generateContentNode:", e);
    return {
      error: `Generation Error: ${e.message}`,
      status: "GENERATION_FAILED",
    };
  }
}
