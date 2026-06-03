import { StateType } from "../state";
import { getModel } from "../utils/model";
import { OutputSchema } from "../types/generate_content_type";

export async function chatConclusionNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- 📝 GENERATING POST FROM CHAT HISTORY ---");

  try {
    const model = await getModel({
      provider: "ollama",
      model: "gemma4:31b-cloud",
      temperature: 0,
    });

    const systemPrompt = `You are an expert React Developer and a popular tech blogger. Based on the conversation history with the user, create a high-performing LinkedIn post.

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
}`;

    const chatContext =
      state.chatHistory
        ?.map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
        )
        .join("\n\n") || "No chat history available.";

    const userPrompt = `Based on the following conversation, create a LinkedIn post that captures the key insights and technical concepts discussed:

<conversation_history>
${chatContext}
</conversation_history>

Create a post that:
- Reflects the user's interests and questions from the conversation
- Includes practical code examples related to the discussed topics
- Has an engaging hook and clear structure
- Ends with a technical challenge

Return ONLY valid JSON matching the required schema.`;

    const structuredModel = model.withStructuredOutput(OutputSchema, {
      method: "jsonMode",
      includeRaw: false,
    });

    const response = await structuredModel.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    return {
      post: { ...response },
      error: null,
      status: "GENERATION_COMPLETE",
      isApproved: false,
      feedback: "",
    };
  } catch (e: any) {
    console.error("❌ Error generating post from chat:", e);
    return {
      error: `Chat conclusion error: ${e.message}`,
      status: "CHAT_CONCLUSION_ERROR",
    };
  }
}
