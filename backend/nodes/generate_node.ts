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
7. IMPORTANT: Return ONLY valid JSON. Do not include markdown formatting, code blocks, or any text outside the JSON object.

EXAMPLE OUTPUT FORMAT (use these exact field names):
{
  "postTitle": "Stop using Math.random() for your React IDs",
  "postContent": "If you are generating IDs...\\n\\nReact provides the useId hook...",
  "codeExample": "import { useId } from 'react';\\n\\nfunction LoginForm() { ... }",
  "tehnicalChallange": {
    "title": "Build an accessible form",
    "description": "Create a custom TextInput component using useId to link labels and inputs.",
    "difficulty": "Easy"
  },
  "hashtags": ["#React", "#useId", "#Accessibility"]
}
  `.trim();

  // 2. Dynamic runtime context isolated using XML-style data tags
  let userPrompt = `
<source_url>
${state.url}
</source_url>

<source_summary>
${state.summary}
</source_summary>

CRITICAL: The codeExample MUST be a practical, real-world example of the EXACT API/hook/concept from the source URL. Do NOT use generic or unrelated code examples.
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
    // Use powerful Ollama Cloud model for post generation
    // Options: gemma4:31b-cloud, deepseek-v4-pro-cloud, qwen3-next:80b-cloud
    const contentGeneratorAgent = await getModel({
      model: "gemma4:31b-cloud",
      temperature: 0.7,
    });

    const structuredModel = contentGeneratorAgent.withStructuredOutput(
      OutputSchema,
      {
        method: "jsonMode",
        includeRaw: false,
      },
    );

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
