import { FastifyReply, FastifyRequest } from "fastify";
import { appGraph } from "../graph";
import { Command } from "@langchain/langgraph";

export async function telegramApproveController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { thread_id, approved } = request.body as {
    thread_id: string;
    approved: boolean;
  };

  if (!thread_id) {
    return reply
      .code(400)
      .send({ error: "Missing required thread_id parameter." });
  }

  const config = { configurable: { thread_id } };

  try {
    console.log(
      `📱 Telegram approval received for thread ${thread_id}: ${approved ? "APPROVED" : "REJECTED"}`,
    );

    // Resume the graph with the user's decision
    appGraph
      .invoke(new Command({ resume: { approved } }), config)
      .then(() => {
        console.log(`✅ Graph resumed from Telegram for thread: ${thread_id}`);
      })
      .catch((err) => {
        console.error(
          `❌ Background graph resume error for thread ${thread_id}:`,
          err,
        );
      });

    return reply.code(200).send({
      status: approved ? "POSTING_APPROVED" : "POSTING_REJECTED",
      thread_id: thread_id,
    });
  } catch (error: any) {
    console.error("❌ Error in telegramApproveController:", error);
    return reply
      .code(500)
      .send({ error: `Telegram approval processing failed: ${error.message}` });
  }
}
