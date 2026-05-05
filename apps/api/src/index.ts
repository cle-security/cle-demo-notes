import Fastify from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { env } from "./lib/env.js";
import { ensureUploadDir } from "./lib/storage.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { authRoutes } from "./routes/auth.js";
import { noteRoutes } from "./routes/notes.js";
import { userRoutes } from "./routes/users.js";
import { uploadRoutes } from "./routes/uploads.js";

export async function buildApp() {
  await ensureUploadDir();

  const app = Fastify({
    logger: env.nodeEnv === "production" ? true : { transport: undefined },
    bodyLimit: 1024 * 1024, // 1MB for JSON; multipart has its own limit below.
  });

  await app.register(cookie, {
    secret: env.sessionSecret,
    parseOptions: { sameSite: "lax", httpOnly: true },
  });
  await app.register(multipart, {
    limits: { fileSize: env.maxUploadBytes, files: 1 },
  });

  app.addHook("preHandler", attachUser);
  app.setErrorHandler(errorHandler);

  app.get("/api/health", async () => ({ ok: true }));

  await app.register(async (api) => {
    await api.register(authRoutes, { prefix: "/auth" });
    await api.register(noteRoutes, { prefix: "/notes" });
    await api.register(userRoutes); // /profile, /me, /admin
    await api.register(uploadRoutes); // /notes/:id/attachment, /attachments/:id
  }, { prefix: "/api" });

  return app;
}

// Only start a server when run directly — tests import buildApp.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = await buildApp();
  app
    .listen({ host: "0.0.0.0", port: env.port })
    .then(() => app.log.info(`api listening on ${env.port}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
