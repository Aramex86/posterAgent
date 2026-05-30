import { FastifyRequest, FastifyReply } from "fastify";
import { appGraph } from "../graph";

interface Payload {
  message: string;
  timestamp: number;
  post?: any; // or define the type of 'post' if you know it
}
export const getAgentUpdatesController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { thread_id } = request.params as { thread_id: string };
  console.log("🔌 Request headers:", request.headers);
  console.log("🔌 Origin:", request.headers.origin);

  reply.raw.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");

  try {
    if (!thread_id || thread_id === "0" || thread_id === "undefined") {
      console.log(
        "⚠️ Postponing stream connection: Client provided uninitialized thread ID:",
        thread_id,
      );

      // Write an initializing heartbeat block instead of calling the graph
      reply.hijack();
      reply.raw.flushHeaders();
      reply.raw.write(
        `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify({ message: "initializing", timestamp: Date.now() })}\n\n`,
      );
      if (!reply.raw.writableEnded) reply.raw.end();
      return;
    }

    const config = { configurable: { thread_id } };
    const state = await appGraph.getState(config);

    // 2. FIX FOR THE __START__ ERROR:
    // If the graph has already run via your runAgent invoke() and is currently
    // waiting at the 'approve' node checkpoint, don't trigger a broken stream.
    // Manually push down the step event block so your frontend Steps light up!
    // Check for first approval gate (content approval)
    if (state.next && state.next.includes("approve")) {
      console.log(
        "🎯 Thread resting at 'approve' node. Informing frontend UI...",
      );
      const payload = {
        message: "__interrupt__", // Frontend expects this to show approval UI
        timestamp: Date.now(),
        post: state.values.post || null,
      };
      reply.raw.write(
        `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify(payload)}\n\n`,
      );
    }

    // Check for second approval gate (LinkedIn posting approval)
    if (state.next && state.next.includes("approve_posting")) {
      console.log(
        "🎯 Thread resting at 'approve_posting' node. Informing frontend UI...",
      );
      const payload = {
        message: "approve_posting", // Frontend shows second approval UI
        timestamp: Date.now(),
        post: state.values.post || null,
        imageUrl: state.values.imageUrl || null,
      };
      reply.raw.write(
        `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify(payload)}\n\n`,
      );
    }

    // 3. Fallback: If it's not paused at 'approve', continue streaming loop rerun steps natively.
    // Pass 'null' instead of an object to safely maintain thread continuity!
    const currentState = await appGraph.stream(null, {
      ...config,
      streamMode: "updates",
    });

    for await (const chunk of currentState) {
      for (const [nodeName, nodeState] of Object.entries(chunk)) {
        console.log(nodeName, "nodeName");
        const payload: Payload = {
          message: nodeName,
          timestamp: Date.now(),
        };

        if (nodeName === "generate_content" && (nodeState as any)?.post) {
          payload.post = (nodeState as any).post;
        }

        if (nodeName === "upload_image" && (nodeState as any)?.imageUrl) {
          payload.imageUrl = (nodeState as any).imageUrl;
        }

        reply.raw.write(
          `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify(payload)}\n\n`,
        );
      }
    }
  } catch (error) {
    console.error("🔴 Stream Error:", error);
    if (!reply.raw.writableEnded) {
      reply.raw.write(
        `event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`,
      );
    }
  } finally {
    if (!reply.raw.writableEnded) {
      reply.raw.end();
    }
  }

  request.raw.on("close", () => {
    console.log("Client disconnected");
    if (!reply.raw.writableEnded) {
      reply.raw.end();
    }
  });
};
