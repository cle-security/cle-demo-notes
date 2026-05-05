import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function upsertUser(opts: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  role?: "user" | "admin";
  bio?: string;
}) {
  const passwordHash = await argon2.hash(opts.password, { type: argon2.argon2id });
  return prisma.user.upsert({
    where: { email: opts.email },
    update: {
      username: opts.username,
      displayName: opts.displayName,
      role: opts.role ?? "user",
      bio: opts.bio ?? "",
    },
    create: {
      email: opts.email,
      username: opts.username,
      displayName: opts.displayName,
      passwordHash,
      role: opts.role ?? "user",
      bio: opts.bio ?? "",
    },
  });
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "adminpass123";

  const admin = await upsertUser({
    email: adminEmail,
    username: adminUsername,
    displayName: "Site Admin",
    password: adminPassword,
    role: "admin",
    bio: "I keep the lights on.",
  });

  const alice = await upsertUser({
    email: "alice@example.com",
    username: "alice",
    displayName: "Alice Lin",
    password: "alicepass123",
    bio: "Notes about gardens and small machines.",
  });

  const bob = await upsertUser({
    email: "bob@example.com",
    username: "bob",
    displayName: "Bob Reyes",
    password: "bobpass123",
    bio: "Cooking, climbing, and the occasional rant.",
  });

  // Wipe + re-seed sample notes so the seed script is idempotent.
  await prisma.note.deleteMany({ where: { ownerId: { in: [alice.id, bob.id] } } });

  const note1 = await prisma.note.create({
    data: {
      ownerId: alice.id,
      title: "Sourdough log",
      body: "## Day 1\n\nMixed flour + water. Already smells alive.\n\n- 200g rye\n- 200g warm water",
    },
  });
  await prisma.note.create({
    data: {
      ownerId: alice.id,
      title: "Reading list",
      body: "1. *The Soul of a New Machine*\n2. *Working in Public*\n3. *The Mythical Man-Month*",
    },
  });
  await prisma.note.create({
    data: {
      ownerId: bob.id,
      title: "Climbing knots",
      body: "Figure-8, clove hitch, prusik. Don't trust the bowline on a bight under shock load.",
    },
  });

  // Share Alice's sourdough note with Bob.
  await prisma.noteShare.upsert({
    where: { noteId_userId: { noteId: note1.id, userId: bob.id } },
    update: {},
    create: { noteId: note1.id, userId: bob.id },
  });

  console.log(
    `Seeded: admin=${adminUsername}/${adminEmail}, alice/alicepass123, bob/bobpass123`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
