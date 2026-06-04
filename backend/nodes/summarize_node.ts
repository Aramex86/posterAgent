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

  const system_message = `You are a software engineering expert. Below is the documentation text.
  Provide a brief summary, highlighting:
  1. The main purpose of this API/Hook/Concept.
  2. The single most important usage example.
  
  Text: ${context}`;

  try {
    const summarizeAgent = await getModel({
      provider: "ollama",
      model: "gemma4:31b-cloud",
      temperature: 0,
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
