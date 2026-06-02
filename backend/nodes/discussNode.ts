import { interrupt } from "@langchain/langgraph";
import { StateType } from "../state";
import { getModel } from "../utils/model";

export async function discussNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- 💬 ENTERING DISCUSSION NODE ---");

  const response = interrupt({
    message: "Let's discuss the post before approval.",
    post: state.post,
    imageUrl: state.imageUrl,
    options: ["approve", "discuss", "rewrite"],
  }) as {
    action: "approve" | "discuss" | "rewrite";
    message?: string;
  };

  console.log("--- 💬 DISCUSSION RESUMED ---", response);

  // If user wants to discuss, generate AI response
  if (response.action === "discuss" && response.message) {
    try {
      // Use a lightweight Ollama Cloud model for discussion
      // Available: gemma4:26b, qwen3.5:9b, deepseek-v3.2, minimax-m2.5, glm-4.7
      const model = await getModel({
        model: "gemma4:26b", // Fast and cost-effective for chat
        temperature: 0.8,
      });

      const systemPrompt = `You are a helpful LinkedIn content strategist. The user is discussing a draft post with you.
You can:
- Explain why certain choices were made
- Suggest improvements
- Answer questions about the content
- Propose alternative angles

Keep responses concise and actionable. Always end by asking if they want to approve, rewrite, or continue discussing.`;

      const userPrompt = `Current draft post:
Title: ${state.post.postTitle}
Content: ${state.post.postContent}
Code Example: ${state.post.codeExample}
Challenge: ${state.post.tehnicalChallange?.title}

User's question/comment: ${response.message}

Please respond helpfully.`;

      const aiResponse = await model.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return {
        status: "DISCUSSING",
        // Store discussion context for next iteration
        feedback: `Discussion: ${response.message}\nAI: ${aiResponse.content}`,
        error: null,
      };
    } catch (err: any) {
      console.error("❌ Discussion AI error:", err.message);
      return {
        status: "DISCUSS_ERROR",
        error: `Discussion error: ${err.message}`,
      };
    }
  }

  // If approve or rewrite, pass through
  return {
    isApproved: response.action === "approve",
    feedback:
      response.action === "rewrite"
        ? "User requested rewrite after discussion"
        : "",
    status:
      response.action === "approve" ? "DISCUSS_APPROVED" : "DISCUSS_REWRITE",
    error: null,
  };
}
