import { select, execute } from "../client";
import { insert } from "../mutate";

export interface User {
  id: string;
  username: string;
  password: string; // bcrypt hash
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  username: string;
  login_at: string;
  expires_at: string | null;
}

export async function findUser(username: string): Promise<User | null> {
  const rows = await select<User>("SELECT * FROM users WHERE username = $1", [username]);
  return rows[0] ?? null;
}

export async function createUser(
  username: string,
  passwordHash: string,
  displayName?: string,
): Promise<string> {
  return insert("users", {
    username,
    password: passwordHash,
    display_name: displayName ?? null,
  });
}

export async function loadSession(): Promise<Session | null> {
  const rows = await select<Session>("SELECT * FROM sessions WHERE id='current'");
  return rows[0] ?? null;
}

export async function saveSession(user: User): Promise<void> {
  await execute(
    "INSERT OR REPLACE INTO sessions(id, user_id, username, login_at, expires_at) VALUES ('current', $1, $2, $3, NULL)",
    [user.id, user.username, new Date().toISOString()],
  );
}

export async function clearSession(): Promise<void> {
  await execute("DELETE FROM sessions WHERE id='current'", []);
}

export async function userCount(): Promise<number> {
  const rows = await select<{ n: number }>("SELECT COUNT(*) AS n FROM users");
  return rows[0]?.n ?? 0;
}
