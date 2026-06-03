import { FastifyRequest, FastifyReply } from "fastify";
import { appGraph } from "../graph";

interface Payload {
  message: string;
  timestamp: number;
  post?: any;
  imageUrl?: any;
}

function setupSSEHeaders(reply: FastifyReply) {
  reply.raw.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
}

function sendInitializingHeartbeat(reply: FastifyReply, thread_id: string) {
  reply.hijack();
  reply.raw.flushHeaders();
  reply.raw.write(
    `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify({ message: "initializing", timestamp: Date.now() })}\n\n`,
  );
  if (!reply.raw.writableEnded) reply.raw.end();
}

function handleApprovalGates(
  reply: FastifyReply,
  state: any,
  thread_id: string,
) {
  if (state.next?.includes("approve")) {
    console.log(
      "🎯 Thread resting at 'approve' node. Informing frontend UI...",
    );
    const payload = {
      message: "__interrupt__",
      timestamp: Date.now(),
      post: state.values.post || null,
      chatHistory: state.values.chatHistory || [],
      chatMode: state.values.chatMode || false,
    };
    reply.raw.write(
      `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify(payload)}\n\n`,
    );
  }

  if (state.next?.includes("free_chat")) {
    console.log(
      "🎯 Thread resting at 'free_chat' node. Informing frontend UI...",
    );
    const payload = {
      message: "__chat__",
      timestamp: Date.now(),
      chatHistory: state.values.chatHistory || [],
      chatMode: true,
    };
    reply.raw.write(
      `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify(payload)}\n\n`,
    );
  }

  if (state.next?.includes("approve_posting")) {
    console.log(
      "🎯 Thread resting at 'approve_posting' node. Informing frontend UI...",
    );
    const payload = {
      message: "approve_posting",
      timestamp: Date.now(),
      post: state.values.post || null,
      imageUrl: state.values.imageUrl || null,
    };
    reply.raw.write(
      `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify(payload)}\n\n`,
    );
  }
}

function buildPayload(nodeName: string, nodeState: any): Payload {
  const payload: Payload = {
    message: nodeName,
    timestamp: Date.now(),
  };

  if (nodeName === "generate_content" && nodeState?.post) {
    payload.post = nodeState.post;
  }

  if (nodeName === "upload_image" && nodeState?.imageUrl) {
    payload.imageUrl = nodeState.imageUrl;
  }

  return payload;
}

async function streamGraphUpdates(
  reply: FastifyReply,
  config: { configurable: { thread_id: string } },
  thread_id: string,
) {
  const currentState = await appGraph.stream(null, {
    ...config,
    streamMode: "updates",
  });

  for await (const chunk of currentState) {
    for (const [nodeName, nodeState] of Object.entries(chunk)) {
      console.log(nodeName, "nodeName");
      const payload = buildPayload(nodeName, nodeState as any);

      reply.raw.write(
        `id: ${thread_id}\nevent: update\ndata: ${JSON.stringify(payload)}\n\n`,
      );
    }
  }
}

function handleStreamError(reply: FastifyReply, error: unknown) {
  console.error("🔴 Stream Error:", error);
  if (!reply.raw.writableEnded) {
    reply.raw.write(
      `event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`,
    );
  }
}

function cleanupStream(reply: FastifyReply, request: FastifyRequest) {
  if (!reply.raw.writableEnded) {
    reply.raw.end();
  }

  request.raw.on("close", () => {
    console.log("Client disconnected");
    if (!reply.raw.writableEnded) {
      reply.raw.end();
    }
  });
}

export const getAgentUpdatesController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { thread_id } = request.params as { thread_id: string };
  console.log("🔌 Request headers:", request.headers);
  console.log("🔌 Origin:", request.headers.origin);

  setupSSEHeaders(reply);

  try {
    if (!thread_id || thread_id === "0" || thread_id === "undefined") {
      console.log(
        "⚠️ Postponing stream connection: Client provided uninitialized thread ID:",
        thread_id,
      );
      sendInitializingHeartbeat(reply, thread_id);
      return;
    }

    const config = { configurable: { thread_id } };
    const state = await appGraph.getState(config);

    handleApprovalGates(reply, state, thread_id);
    await streamGraphUpdates(reply, config, thread_id);
  } catch (error) {
    handleStreamError(reply, error);
  } finally {
    cleanupStream(reply, request);
  }
};
