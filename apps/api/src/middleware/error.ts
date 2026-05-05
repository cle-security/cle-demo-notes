import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export function errorHandler(err: FastifyError, req: FastifyRequest, reply: FastifyReply) {
  if (err instanceof ZodError) {
    return reply.code(400).send({
      error: "validation_failed",
      message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
  }
  if (err.statusCode && err.statusCode < 500) {
    return reply
      .code(err.statusCode)
      .send({ error: err.code ?? "request_error", message: err.message });
  }
  req.log.error({ err }, "unhandled error");
  reply.code(500).send({ error: "internal_error", message: "Something went wrong" });
}
