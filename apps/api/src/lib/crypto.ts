import argon2 from "argon2";

// argon2id with library defaults — these match OWASP's 2024 baseline and
// argon2 picks sensible memory/time costs on its own.
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
