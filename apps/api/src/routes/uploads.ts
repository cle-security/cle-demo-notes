import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/db.js";
import { ALLOWED_MIME, deleteUpload, readUpload, writeUpload } from "../lib/storage.js";
import { env } from "../lib/env.js";
import { requireAuth } from "../middleware/auth.js";

export async function uploadRoutes(app: FastifyInstance) {
  // Attach (or replace) the single attachment for a note. Owner only.
  app.post("/notes/:id/attachment", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const note = await prisma.note.findUnique({
      where: { id },
      include: { attachment: true },
    });
    if (!note || note.ownerId !== req.user!.id) {
      return reply.code(404).send({ error: "not_found", message: "Note not found" });
    }
    const file = await req.file();
    if (!file) {
      return reply.code(400).send({ error: "bad_request", message: "No file uploaded" });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return reply
        .code(415)
        .send({ error: "unsupported_media_type", message: "Only PNG/JPEG/GIF/WEBP/PDF allowed" });
    }
    const buf = await file.toBuffer();
    if (buf.length > env.maxUploadBytes) {
      return reply.code(413).send({ error: "too_large", message: "File too large" });
    }
    // The body filter inside @fastify/multipart also enforces the size limit
    // and will throw before we get here for streamed reads; this is a belt-and-
    // braces check after we've already buffered.

    const storedAs = await writeUpload(buf, file.mimetype);

    if (note.attachment) {
      await deleteUpload(note.attachment.storedAs);
      await prisma.attachment.delete({ where: { id: note.attachment.id } });
    }
    const att = await prisma.attachment.create({
      data: {
        noteId: note.id,
        filename: file.filename.slice(0, 200),
        storedAs,
        mimeType: file.mimetype,
        size: buf.length,
      },
    });
    return reply.send({
      attachment: {
        id: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
      },
    });
  });

  // Stream the file back, gated by the same access check used for the note.
  app.get("/attachments/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const att = await prisma.attachment.findUnique({
      where: { id },
      include: { note: { include: { shares: true } } },
    });
    if (!att) return reply.code(404).send({ error: "not_found", message: "Not found" });
    const userId = req.user!.id;
    const allowed =
      att.note.ownerId === userId || att.note.shares.some((s) => s.userId === userId);
    if (!allowed) return reply.code(404).send({ error: "not_found", message: "Not found" });

    const buf = await readUpload(att.storedAs);
    reply.header("Content-Type", att.mimeType);
    // Always force download for non-image types; let images render inline.
    const disposition = att.mimeType.startsWith("image/") ? "inline" : "attachment";
    // Filenames can contain quotes/newlines — strip anything that would break the header.
    const safeName = att.filename.replace(/[\r\n"\\]/g, "_");
    reply.header("Content-Disposition", `${disposition}; filename="${safeName}"`);
    return reply.send(buf);
  });
}
