import { FastifyInstance } from "fastify";
import { runAgentController } from "../controlers/runAgentController";

export async function startAgentRoute(fastify: FastifyInstance) {
  fastify.post("/start-agent", runAgentController);
}
