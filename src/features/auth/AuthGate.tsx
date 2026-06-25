import { useEffect, useState } from "react";
import { Button, TextInput } from "@/components/ui/controls";
import { useAuth } from "@/store/auth";
import { useI18n } from "@/lib/i18n";

/** Full-screen login/register gate. Rendered on top of everything when
 *  no session is active. */
export function AuthGate() {
  const session = useAuth((s) => s.session);
  const registered = useAuth((s) => s.registered);
  const bootstrap = useAuth((s) => s.bootstrap);
  const { t } = useI18n();

  useEffect(() => { bootstrap(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Still loading — no flicker.
  if (session === null) return null;
  // Already logged in — children render the app.
  if (session !== false) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-sunken">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-raised p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-accent text-lg font-bold text-accent-fg">A</span>
          <h1 className="mt-2 text-xl font-semibold text-content">Acta</h1>
        </div>
        {registered ? (
          <LoginForm t={t} />
        ) : (
          <RegisterForm t={t} firstUser />
        )}
      </div>
    </div>
  );
}

function LoginForm({ t }: { t: (k: string, v?: Record<string, any>) => string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuth((s) => s.login);
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);

  const submit = (e: React.FormEvent) => { e.preventDefault(); login(username, password); };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-center text-sm font-medium text-content">{t("auth.login")}</h2>
      <TextInput autoFocus placeholder={t("auth.username")} value={username} onChange={(e) => setUsername(e.target.value)} />
      <TextInput type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="rounded bg-urgent/10 px-3 py-2 text-center text-2xs text-urgent">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={busy || !username || !password}>
        {busy ? t("auth.loggingIn") : t("auth.login")}
      </Button>
    </form>
  );
}

function RegisterForm({ t, firstUser }: { t: (k: string, v?: Record<string, any>) => string; firstUser: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [display, setDisplay] = useState("");
  const register = useAuth((s) => s.register);
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pw = password.trim();
    if (pw.length < 4) { return; /* handled inline */ }
    register(username, password, display);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-center text-sm font-medium text-content">{t("auth.register")}</h2>
      {firstUser && (
        <p className="rounded bg-accent-soft/50 px-3 py-2 text-center text-2xs text-accent">
          {t("auth.firstUserHint")}
        </p>
      )}
      <TextInput autoFocus placeholder={t("auth.username")} value={username} onChange={(e) => setUsername(e.target.value)} />
      <div>
        <TextInput type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} />
        {password.length > 0 && password.length < 4 && (
          <p className="mt-1 text-2xs text-urgent">{t("auth.passwordHint")}</p>
        )}
      </div>
      <TextInput placeholder={t("auth.displayName")} value={display} onChange={(e) => setDisplay(e.target.value)} />
      {error && <p className="rounded bg-urgent/10 px-3 py-2 text-center text-2xs text-urgent">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={busy || !username.trim() || password.length < 4}>
        {busy ? t("auth.registering") : t("auth.register")}
      </Button>
    </form>
  );
}
