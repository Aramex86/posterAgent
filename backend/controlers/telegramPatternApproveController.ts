import { FastifyReply, FastifyRequest } from "fastify";
import {
  approvePendingPatterns,
  rejectPendingPatterns,
  loadPendingPatterns,
} from "../utils/patternLearning";
import { bot } from "../utils/telegramBot";

export async function telegramPatternApproveController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { chat_id, approved } = request.body as {
    chat_id: number;
    approved: boolean;
  };

  if (!chat_id) {
    return reply
      .code(400)
      .send({ error: "Missing required chat_id parameter." });
  }

  try {
    const pending = loadPendingPatterns();

    if (!pending) {
      await bot.api.sendMessage(
        chat_id,
        "⚠️ No pending pattern review found. Nothing to approve or reject.",
      );
      return reply.code(200).send({
        status: "NO_PENDING",
        message: "No pending patterns to review.",
      });
    }

    if (approved) {
      const success = approvePendingPatterns();
      if (success) {
        await bot.api.sendMessage(
          chat_id,
          "✅ *Pattern Review Approved*\n\n" +
            "New writing patterns have been saved and will be used for future post generation.",
          { parse_mode: "Markdown" },
        );
        console.log(`✅ Pattern review approved by chat ${chat_id}`);
        return reply.code(200).send({
          status: "PATTERNS_APPROVED",
          chat_id,
        });
      }
    } else {
      const success = rejectPendingPatterns();
      if (success) {
        await bot.api.sendMessage(
          chat_id,
          "❌ *Pattern Review Rejected*\n\n" +
            "Current writing patterns remain unchanged.",
          { parse_mode: "Markdown" },
        );
        console.log(`❌ Pattern review rejected by chat ${chat_id}`);
        return reply.code(200).send({
          status: "PATTERNS_REJECTED",
          chat_id,
        });
      }
    }

    return reply
      .code(500)
      .send({ error: "Failed to process pattern approval" });
  } catch (error: any) {
    console.error("❌ Error in telegramPatternApproveController:", error);
    return reply
      .code(500)
      .send({ error: `Pattern approval processing failed: ${error.message}` });
  }
}
