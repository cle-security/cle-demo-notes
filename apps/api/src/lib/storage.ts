import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "./env.js";

export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export async function ensureUploadDir() {
  await fs.mkdir(env.uploadDir, { recursive: true });
}

function extFor(mime: string): string {
  switch (mime) {
    case "image/png": return ".png";
    case "image/jpeg": return ".jpg";
    case "image/gif": return ".gif";
    case "image/webp": return ".webp";
    case "application/pdf": return ".pdf";
    default: return "";
  }
}

export async function writeUpload(buffer: Buffer, mimeType: string): Promise<string> {
  await ensureUploadDir();
  const storedAs = crypto.randomBytes(16).toString("hex") + extFor(mimeType);
  await fs.writeFile(path.join(env.uploadDir, storedAs), buffer);
  return storedAs;
}

export async function readUpload(storedAs: string): Promise<Buffer> {
  // Defensive: storedAs is generated server-side, but reject any path traversal anyway.
  if (storedAs.includes("/") || storedAs.includes("\\") || storedAs.includes("..")) {
    throw new Error("invalid stored filename");
  }
  return fs.readFile(path.join(env.uploadDir, storedAs));
}

export async function deleteUpload(storedAs: string) {
  if (storedAs.includes("/") || storedAs.includes("\\") || storedAs.includes("..")) return;
  await fs.unlink(path.join(env.uploadDir, storedAs)).catch(() => {});
}
