import { FastifyReply, FastifyRequest } from "fastify";
import { runAgent } from "../utils/runAgent";

// const TargetURL = "https://react.dev/reference/react/useActionState";
// await runAgent(TargetURL, "session_2");

export const runAgentController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const thread_id = `session_${crypto.randomUUID()}`;

  const { url } = request.body as { url: string; thread_id: string };

  console.log(`🚀 Starting agent execution for thread: ${thread_id}`);

  try {
    // 2. ⚡ REMOVE THE 'await' KEYWORD HERE!
    // This launches your runAgent utility function in the background.
    // The graph begins running nodes immediately, but it does NOT freeze this HTTP thread.
    runAgent(url, thread_id).catch((err) => {
      console.error(
        `❌ Background runAgent error on thread ${thread_id}:`,
        err,
      );
    });

    // 3. Return the thread_id to React immediately (within milliseconds!)
    // Your React app will receive this ID instantly and open the SSE stream
    // while the background agent is still executing the 'scrape' node.
    return reply.type("application/json").code(200).send({
      status: "INITIALIZED",
      thread_id: thread_id,
    });
  } catch (error) {
    console.error("🔴 Controller initialization error:", error);
    return reply
      .code(500)
      .send({ error: "Internal agent initialization failed" });
  }
};
