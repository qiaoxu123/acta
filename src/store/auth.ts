import { create } from "zustand";
import bcrypt from "bcryptjs";
import {
  findUser,
  createUser as dbCreateUser,
  loadSession,
  saveSession,
  clearSession,
  userCount,
} from "@/db/repositories/users";
import type { Session } from "@/db/repositories/users";

interface AuthState {
  /** null = still loading, false = not logged in, Session = logged in */
  session: Session | null | false;
  registered: boolean; // true once any user exists
  error: string | null;
  busy: boolean;

  /** Called once at boot: probes DB and restores session. */
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null, // loading
  registered: false,
  error: null,
  busy: false,

  bootstrap: async () => {
    try {
      const [count, sess] = await Promise.all([userCount(), loadSession()]);
      set({ registered: count > 0, session: sess || false, error: null });
    } catch (e) {
      set({ session: false, registered: false, error: String(e) });
    }
  },

  login: async (username, password) => {
    set({ busy: true, error: null });
    try {
      const u = await findUser(username.trim());
      if (!u) { set({ busy: false, error: "用户名不存在" }); return; }
      const ok = bcrypt.compareSync(password, u.password);
      if (!ok) { set({ busy: false, error: "密码错误" }); return; }
      await saveSession(u);
      set({
        session: { id: "current", user_id: u.id, username: u.username, login_at: new Date().toISOString(), expires_at: null },
        busy: false, error: null,
      });
    } catch (e) {
      set({ busy: false, error: String(e) });
    }
  },

  register: async (username, password, displayName) => {
    set({ busy: true, error: null });
    try {
      const uname = username.trim();
      if (!uname || !password) { set({ busy: false, error: "用户名和密码不能为空" }); return; }
      const exist = await findUser(uname);
      if (exist) { set({ busy: false, error: "用户名已存在" }); return; }
      const hash = bcrypt.hashSync(password, 10);
      await dbCreateUser(uname, hash, displayName?.trim() || undefined);
      // Auto-login after registration
      const u = await findUser(uname);
      if (!u) throw new Error("注册后查询失败");
      await saveSession(u);
      set({
        registered: true,
        session: { id: "current", user_id: u.id, username: u.username, login_at: new Date().toISOString(), expires_at: null },
        busy: false, error: null,
      });
    } catch (e) {
      set({ busy: false, error: String(e) });
    }
  },

  logout: async () => {
    await clearSession();
    set({ session: false, error: null });
  },
}));
