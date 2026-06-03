import { interrupt } from "@langchain/langgraph";
import { StateType } from "../state";
import { getModel } from "../utils/model";

export async function freeChatNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- 💬 ENTERING FREE CHAT NODE ---");

  const response = interrupt({
    message:
      "Let's discuss your topic freely. I'll ask questions and suggest ideas.",
    chatHistory: state.chatHistory || [],
    options: ["continue", "conclude", "cancel"],
  }) as {
    action: "continue" | "conclude" | "cancel";
    message?: string;
  };

  console.log("--- 💬 FREE CHAT RESUMED ---", response);

  if (response.action === "cancel") {
    return {
      status: "CHAT_CANCELLED",
      error: null,
      chatConcluded: true,
    };
  }

  if (response.action === "conclude") {
    return {
      status: "CHAT_CONCLUDED",
      error: null,
      chatConcluded: true,
    };
  }

  // If user wants to continue chatting
  if (response.action === "continue" && response.message) {
    try {
      const model = await getModel({
        provider: "ollama",
        model: "gemma4:31b-cloud",
        temperature: 0.7,
      });

      const systemPrompt = `You are an expert React Developer and a popular tech blogger. You are having a free-form conversation with a user to help them develop ideas for a LinkedIn post.

Your goals:
- Ask clarifying questions about technical topics
- Suggest interesting angles and perspectives
- Help the user structure their thoughts
- Propose concrete examples or code snippets when relevant
- Keep the conversation engaging and focused on React/frontend development

Be conversational, friendly, and insightful. Don't be too formal. Ask follow-up questions to dig deeper into the topic.

Current conversation history is provided. Respond naturally as a colleague would.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...(state.chatHistory || []).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: response.message },
      ];

      const aiResponse = await model.invoke(messages);

      const updatedHistory = [
        ...(state.chatHistory || []),
        { role: "user" as const, content: response.message },
        { role: "assistant" as const, content: aiResponse.content as string },
      ];

      return {
        status: "CHATTING",
        chatHistory: updatedHistory,
        error: null,
      };
    } catch (err: any) {
      console.error("❌ Free chat AI error:", err.message);
      return {
        status: "CHAT_ERROR",
        error: `Chat error: ${err.message}`,
      };
    }
  }

  return {
    status: "CHATTING",
    error: null,
  };
}
