import { FastifyInstance } from "fastify";
import { telegramApproveController } from "../controlers/telegramApproveController.js";

export async function telegramApproveRoute(fastify: FastifyInstance) {
  fastify.post("/telegram/approve", telegramApproveController);
}
