import { FastifyInstance } from "fastify";
import { validateController } from "../controlers/validateController";

export async function validatePostRoute(fastify: FastifyInstance) {
  fastify.post("/validate-post", validateController);
}
