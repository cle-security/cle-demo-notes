import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const noteInput = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(50_000).default(""),
});

const shareInput = z.object({
  username: z.string().min(1).max(30),
});

function serializeNote(n: any) {
  return {
    id: n.id,
    ownerId: n.ownerId,
    ownerUsername: n.owner.username,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    sharedWith: n.shares.map((s: any) => ({ id: s.user.id, username: s.user.username })),
    attachment: n.attachment
      ? {
          id: n.attachment.id,
          filename: n.attachment.filename,
          mimeType: n.attachment.mimeType,
          size: n.attachment.size,
        }
      : null,
  };
}

export async function noteRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // List own + shared notes, with optional ?q= search.
  app.get("/", async (req) => {
    const q = (req.query as { q?: string }).q?.trim() ?? "";
    const userId = req.user!.id;
    const where: any = {
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    };
    if (q) {
      where.AND = [
        {
          OR: [
            { title: { contains: q } },
            { body: { contains: q } },
          ],
        },
      ];
    }
    const notes = await prisma.note.findMany({
      where,
      include: { owner: true, shares: { include: { user: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return {
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        ownerUsername: n.owner.username,
        updatedAt: n.updatedAt.toISOString(),
        shared: n.ownerId !== userId,
      })),
    };
  });

  app.post("/", async (req, reply) => {
    const data = noteInput.parse(req.body);
    const note = await prisma.note.create({
      data: { ...data, ownerId: req.user!.id },
      include: { owner: true, shares: { include: { user: true } }, attachment: true },
    });
    return reply.send({ note: serializeNote(note) });
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const note = await prisma.note.findUnique({
      where: { id },
      include: { owner: true, shares: { include: { user: true } }, attachment: true },
    });
    if (!note) return reply.code(404).send({ error: "not_found", message: "Note not found" });
    const userId = req.user!.id;
    const isOwner = note.ownerId === userId;
    const isShared = note.shares.some((s) => s.userId === userId);
    if (!isOwner && !isShared) {
      return reply.code(404).send({ error: "not_found", message: "Note not found" });
    }
    return { note: serializeNote(note), canEdit: isOwner };
  });

  app.put("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = noteInput.parse(req.body);
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || note.ownerId !== req.user!.id) {
      return reply.code(404).send({ error: "not_found", message: "Note not found" });
    }
    const updated = await prisma.note.update({
      where: { id },
      data,
      include: { owner: true, shares: { include: { user: true } }, attachment: true },
    });
    return { note: serializeNote(updated) };
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const note = await prisma.note.findUnique({ where: { id }, include: { attachment: true } });
    if (!note || note.ownerId !== req.user!.id) {
      return reply.code(404).send({ error: "not_found", message: "Note not found" });
    }
    // Cascade handles shares + attachment row; the file on disk is cleaned up
    // here so we don't leak orphan blobs.
    if (note.attachment) {
      const { deleteUpload } = await import("../lib/storage.js");
      await deleteUpload(note.attachment.storedAs);
    }
    await prisma.note.delete({ where: { id } });
    return { ok: true };
  });

  // Share a note read-only with another user by username.
  app.post("/:id/shares", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { username } = shareInput.parse(req.body);
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || note.ownerId !== req.user!.id) {
      return reply.code(404).send({ error: "not_found", message: "Note not found" });
    }
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target || target.disabled) {
      return reply.code(404).send({ error: "not_found", message: "User not found" });
    }
    if (target.id === req.user!.id) {
      return reply.code(400).send({ error: "bad_request", message: "Cannot share with yourself" });
    }
    await prisma.noteShare.upsert({
      where: { noteId_userId: { noteId: id, userId: target.id } },
      update: {},
      create: { noteId: id, userId: target.id },
    });
    return { ok: true };
  });

  app.delete("/:id/shares/:userId", async (req, reply) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || note.ownerId !== req.user!.id) {
      return reply.code(404).send({ error: "not_found", message: "Note not found" });
    }
    const { count } = await prisma.noteShare.deleteMany({
      where: { noteId: id, userId },
    });
    if (count === 0) {
      return reply.code(404).send({ error: "not_found", message: "Share not found" });
    }
    return { ok: true };
  });
}
