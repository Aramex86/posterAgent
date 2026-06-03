import { FastifyReply, FastifyRequest } from "fastify";
import { appGraph } from "../graph";
import { Command } from "@langchain/langgraph";

export async function chatController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { thread_id, message, action } = request.body as {
    thread_id: string;
    message?: string;
    action: "continue" | "conclude" | "cancel";
  };

  if (!thread_id) {
    return reply
      .code(400)
      .send({ error: "Missing required thread_id parameter." });
  }

  const config = { configurable: { thread_id } };

  try {
    console.log(`💬 Chat action received for thread ${thread_id}: ${action}`);

    // Resume the graph with the user's chat action
    appGraph
      .invoke(new Command({ resume: { action, message } }), config)
      .then(() => {
        console.log(`✅ Graph resumed from chat for thread: ${thread_id}`);
      })
      .catch((err) => {
        console.error(
          `❌ Background graph resume error for thread ${thread_id}:\n`,
          err,
        );
      });

    return reply.code(200).send({
      status: action === "conclude" ? "CHAT_CONCLUDED" : "CHAT_CONTINUED",
      thread_id: thread_id,
    });
  } catch (error: any) {
    console.error("❌ Error in chatController:", error);
    return reply
      .code(500)
      .send({ error: `Chat processing failed: ${error.message}` });
  }
}
