import { StateType } from "../state";
import { getModel } from "../utils/model";

export async function inferTopicNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- INFERRING TOPIC FROM SUMMARY ---");

  if (!state.summary || state.summary.trim() === "") {
    return {
      topic: "software",
      error: null,
      status: "TOPIC_INFERRED",
    };
  }

  try {
    const topicAgent = await getModel({
      provider: "ollama",
      model: "gemma4:31b-cloud",
      temperature: 0,
    });

    const prompt = `Based on the following article summary, classify the primary technology topic in ONE lowercase word.

Examples of valid topics: react, javascript, typescript, css, html, python, nodejs, nextjs, vue, angular, docker, kubernetes, aws, database, ai, ml, webperformance, accessibility, testing, security, graphql, rust, go, java, dotnet

If uncertain, return "software".

Summary:
${state.summary}

Return ONLY the single topic word. No punctuation, no explanation.`;

    const response = await topicAgent.invoke(prompt);
    const rawTopic = (response.content as string).trim().toLowerCase();

    // Clean up: remove punctuation, take first word
    const topic =
      rawTopic.replace(/[^a-z0-9]/g, "").split(/\s+/)[0] || "software";

    console.log(`✅ Inferred topic: ${topic}`);

    return {
      topic,
      error: null,
      status: "TOPIC_INFERRED",
    };
  } catch (e: any) {
    console.error("❌ Topic inference failed:", e.message);
    return {
      topic: "software",
      error: `Topic inference error: ${e.message}`,
      status: "TOPIC_INFERRED",
    };
  }
}
