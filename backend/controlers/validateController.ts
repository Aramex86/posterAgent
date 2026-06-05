import { FastifyReply, FastifyRequest } from "fastify";
import { appGraph } from "../graph";
import { saveToFile } from "../utils/savePostFile";
import { Command } from "@langchain/langgraph";
export async function validateController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { thread_id, feedback } = request.body as {
    feedback: string;
    thread_id: string;
  };

  if (!thread_id) {
    return reply
      .code(400)
      .send({ error: "Missing required thread_id parameter." });
  }

  const config = { configurable: { thread_id } };

  try {
    const isApproved = !feedback || feedback.trim() === "";

    // discussNode expects { action: "approve" | "discuss" | "rewrite", message?: string }
    const resumePayload = isApproved
      ? { action: "approve" }
      : { action: "rewrite", message: feedback };

    console.log(
      `Sending resume payload to thread ${thread_id}:`,
      resumePayload,
    );

    // 3. 🚀 Resume the graph from the discuss node interrupt.
    appGraph
      .invoke(new Command({ resume: resumePayload }), config)
      .then(async () => {
        // Handle file operations in the background after successful completion
        if (isApproved) {
          const updatedState = await appGraph.getState(config);
          if (updatedState.values.post) {
            const fileName = `post_${thread_id}.json`;
            await saveToFile(fileName, updatedState.values.post);
          }
        }
      })
      .catch((err) =>
        console.error("❌ Background graph invocation error:", err),
      );

    return reply.code(200).send({
      status: isApproved ? "APPROVED_AND_SAVED" : "REWRITE_TRIGGERED",
      thread_id: thread_id,
    });
  } catch (error: any) {
    console.error("❌ Error inside validateController:", error);
    return reply
      .code(500)
      .send({ error: `Validation processing failed: ${error.message}` });
  }
}
