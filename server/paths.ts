import { homedir } from "node:os";
import { join } from "node:path";

const IDENTIFIER = "io.github.qiaoxu123.acta";

/**
 * Resolve the SQLite file the Tauri app uses, so the headless service reads and
 * writes the SAME database. Override with `ACTA_DB_PATH` if your install differs
 * (recommended — print the app's data dir to be sure).
 */
export function resolveDbPath(): string {
  if (process.env.ACTA_DB_PATH) return process.env.ACTA_DB_PATH;
  const home = homedir();
  switch (process.platform) {
    case "darwin":
      return join(home, "Library", "Application Support", IDENTIFIER, "acta.db");
    case "win32":
      return join(
        process.env.APPDATA || join(home, "AppData", "Roaming"),
        IDENTIFIER,
        "acta.db",
      );
    default:
      return join(
        process.env.XDG_CONFIG_HOME || join(home, ".config"),
        IDENTIFIER,
        "acta.db",
      );
  }
}

export const config = {
  port: Number(process.env.ACTA_PORT || 8787),
  host: process.env.ACTA_HOST || "127.0.0.1",
  token: process.env.ACTA_API_TOKEN || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  aiModel: process.env.ACTA_AI_MODEL || "claude-sonnet-4-6",
};
