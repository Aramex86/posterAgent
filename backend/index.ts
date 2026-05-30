import { env } from "./env";
import Fastify from "fastify";
import cors from "@fastify/cors";
// import fastifyCors from "@fastify/cors";
import fastifySSE from "@fastify/sse";
import { app } from "./app";

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
  exposedHeaders: ["Content-Type", "Connection"],
});

await fastify.register(fastifySSE);

await fastify.register(app);

fastify.listen({ port: Number(env.PORT), host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
});
