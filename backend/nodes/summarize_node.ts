import { StateType } from "../state";
import { getModel } from "../utils/model";

export async function summarizeNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- SUMMARIZING DOCS ---");

  if (!state.docs || state.docs.length === 0) {
    return {
      error: "Error: No documents available to summarize.",
      status: "SUMMARIZE_FAILED",
    };
  }

  const importantDocs = state.docs.slice(0, 15);

  const context = importantDocs
    .map((doc) => doc.pageContent)
    .join("\n\n---\n\n");

  const system_message = `You are a React expert. Below is the documentation text.
  Provide a brief summary, highlighting:
  1. The main purpose of this API/Hook.
  2. The single most important usage example.
  
  Text: ${context}`;

  try {
    // Use fast Ollama Cloud model for summarization
    const summarizeAgent = await getModel({
      model: "gemma4:9b", // Small and fast for summarization
      temperature: 0.3, // Low temperature for factual summary
    });

    const response = await summarizeAgent.invoke(system_message);

    return {
      summary: response.content as string,
      error: null,
      status: "SUMMARIZATION_COMPLETE",
    };
  } catch (e: any) {
    console.error("❌ Error inside summarizeNode:", e);
    return {
      error: `Summarize Node Error: ${e.message}`,
      status: "SUMMARIZE_FAILED",
    };
  }
}
