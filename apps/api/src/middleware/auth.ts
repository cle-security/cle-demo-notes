import type { FastifyReply, FastifyRequest } from "fastify";
import { SESSION_COOKIE, loadSession } from "../lib/sessions.js";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: "user" | "admin";
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    sessionId?: string;
  }
}

export async function attachUser(req: FastifyRequest) {
  const raw = req.cookies[SESSION_COOKIE];
  if (!raw) return;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return;
  const session = await loadSession(unsigned.value);
  if (!session) return;
  req.sessionId = session.id;
  req.user = {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    email: session.user.email,
    role: session.user.role as "user" | "admin",
  };
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    reply.code(401).send({ error: "unauthenticated", message: "Sign in required" });
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    return reply.code(401).send({ error: "unauthenticated", message: "Sign in required" });
  }
  if (req.user.role !== "admin") {
    return reply.code(403).send({ error: "forbidden", message: "Admin only" });
  }
}
