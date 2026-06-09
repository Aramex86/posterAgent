import { FastifyInstance } from "fastify";
import { registerTelegramBot } from "../telegram/index";

export async function telegramBotRoute(fastify: FastifyInstance) {
  await registerTelegramBot(fastify);
}
