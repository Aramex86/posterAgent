import { FastifyInstance } from "fastify";
import { getAgentUpdatesController } from "../controlers/getAgentUpdatesController";

export async function getAgentUpdatesRoute(fastify: FastifyInstance) {
  fastify.get("/agent-status/:thread_id", getAgentUpdatesController);
}
