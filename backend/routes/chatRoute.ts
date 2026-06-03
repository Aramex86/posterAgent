import { FastifyInstance } from "fastify";
import { chatController } from "../controlers/chatController";

export async function chatRoute(fastify: FastifyInstance) {
  fastify.post("/chat", chatController);
}
