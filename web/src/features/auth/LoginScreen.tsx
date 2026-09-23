import { useState } from 'react';
import { AlertCircle, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/constants/strings';
import { MIN_PASSWORD_LENGTH } from '@/constants/config';
import { Button, Field, Tabs } from '@/components/ui';
import { VersionTag } from '@/components/layout/VersionTag';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, fullName);
    } catch (e: any) {
      setErr(e.message || t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-5">
      <form className="w-full max-w-sm rounded-ui-lg border border-line bg-surface p-7" onSubmit={submit}>
        <div className="flex flex-col items-center">
          <span className="grid size-11 place-items-center rounded-ui-md bg-brand text-white">
            <UtensilsCrossed className="size-5" />
          </span>
          <h1 className="mt-3 text-lg font-semibold tracking-tight">{t.app.name}</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {mode === 'login' ? t.login.subtitleLogin : t.login.subtitleRegister}
          </p>
        </div>

        <Tabs
          items={[
            { key: 'login', label: t.login.tabLogin },
            { key: 'register', label: t.login.tabRegister },
          ]}
          active={mode}
          onChange={setMode}
        />

        {err && (
          <div className="mb-3 flex items-start gap-2 rounded-ui border border-danger-line bg-danger-soft px-3 py-2 text-[13px] text-danger">
            <AlertCircle className="mt-px size-4 shrink-0" />
            {err}
          </div>
        )}

        {mode === 'register' && (
          <Field label={t.login.fullName}>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.login.fullNamePlaceholder}
              required
            />
          </Field>
        )}
        <Field label={t.login.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.login.emailPlaceholder}
            required
          />
        </Field>
        <Field label={t.login.password}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.login.passwordPlaceholder}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </Field>

        <Button variant="primary" block loading={busy} className="mt-1">
          {mode === 'login' ? t.login.submitLogin : t.login.submitRegister}
        </Button>

        <VersionTag className="mt-4 text-center" />
      </form>
    </div>
  );
}
