import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { hashPassword, verifyPassword } from "../lib/crypto.js";
import { SESSION_COOKIE, createSession, destroySession } from "../lib/sessions.js";
import { env } from "../lib/env.js";

const signupSchema = z.object({
  email: z.string().email().max(254),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "letters, digits, and underscore only"),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOpts = (expires?: Date) => ({
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProd,
  signed: true,
  ...(expires ? { expires } : {}),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", async (req, reply) => {
    const data = signupSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      return reply
        .code(409)
        .send({ error: "conflict", message: "Email or username already registered" });
    }
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        passwordHash,
      },
    });
    const session = await createSession(user.id);
    reply.setCookie(SESSION_COOKIE, session.id, cookieOpts(session.expiresAt));
    return reply.send({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    });
  });

  app.post("/login", async (req, reply) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    // Always run verify to keep timing roughly even between known/unknown emails.
    const ok =
      user && !user.disabled
        ? await verifyPassword(user.passwordHash, data.password)
        : false;
    if (!user || !ok || user.disabled) {
      return reply
        .code(401)
        .send({ error: "invalid_credentials", message: "Wrong email or password" });
    }
    const session = await createSession(user.id);
    reply.setCookie(SESSION_COOKIE, session.id, cookieOpts(session.expiresAt));
    return reply.send({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    });
  });

  app.post("/logout", async (req, reply) => {
    if (req.sessionId) await destroySession(req.sessionId);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.send({ ok: true });
  });

  app.get("/me", async (req, reply) => {
    if (!req.user) return reply.send({ user: null });
    return reply.send({ user: req.user });
  });
}
