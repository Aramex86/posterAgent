import { FastifyInstance } from "fastify";
import { telegramPatternApproveController } from "../controlers/telegramPatternApproveController.js";

export async function telegramPatternApproveRoute(fastify: FastifyInstance) {
  fastify.post("/telegram/pattern-approve", telegramPatternApproveController);
}
