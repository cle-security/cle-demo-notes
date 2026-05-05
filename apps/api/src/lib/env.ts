import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, "../..");

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const sessionSecret = required("SESSION_SECRET");
if (sessionSecret.length < 32) {
  // Cookie signing keys shorter than this give barely any entropy.
  throw new Error("SESSION_SECRET must be at least 32 characters");
}

const uploadDirRaw = process.env.UPLOAD_DIR ?? "../../uploads";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  sessionSecret,
  uploadDir: path.isAbsolute(uploadDirRaw)
    ? uploadDirRaw
    : path.resolve(apiRoot, uploadDirRaw),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024),
  isProd: process.env.NODE_ENV === "production",
};
