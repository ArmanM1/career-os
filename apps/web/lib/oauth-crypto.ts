import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { requireServerSecret } from "@/lib/env";

function key() {
  const value = requireServerSecret("CAREER_OS_OAUTH_ENCRYPTION_KEY");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== 32) throw new Error("CAREER_OS_OAUTH_ENCRYPTION_KEY must be a 32-byte base64url value");
  return decoded;
}

export function hashOAuthState(state: string) { return createHash("sha256").update(state).digest("hex"); }

export function encryptOAuthToken(value: string) {
  const nonce = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), nonce); const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); const tag = cipher.getAuthTag();
  return ["v1", nonce.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptOAuthToken(value: string) {
  const [version, nonce, tag, ciphertext] = value.split("."); if (version !== "v1" || !nonce || !tag || !ciphertext) throw new Error("Unsupported encrypted token");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(nonce, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
