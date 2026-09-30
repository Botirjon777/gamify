import "server-only";
import { randomBytes } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";

// argon2id with OWASP-recommended parameters (19 MiB, 2 iterations), in WebAssembly — no native binary,
// so the same build runs on Windows (dev) and Linux (VPS). Output is the standard PHC string
// ($argon2id$v=19$m=19456,t=2,p=1$…), compatible with hashes created by other argon2 libraries.
export const hashPassword = (password: string) =>
  argon2id({
    password,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: "encoded",
  });

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await argon2Verify({ password, hash: passwordHash });
  } catch {
    return false;
  }
}
