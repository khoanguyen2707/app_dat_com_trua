import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/constants/strings';
import { MIN_PASSWORD_LENGTH } from '@/constants/config';
import { cls } from '@/lib/format';
import { Button, Field } from '@/components/ui';

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
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">🍱</div>
        <h1 className="center" style={{ fontSize: 22 }}>
          {t.app.name}
        </h1>
        <p className="center muted small" style={{ marginTop: 4 }}>
          {mode === 'login' ? t.login.subtitleLogin : t.login.subtitleRegister}
        </p>

        <div className="seg">
          <button type="button" className={cls(mode === 'login' && 'active')} onClick={() => setMode('login')}>
            {t.login.tabLogin}
          </button>
          <button type="button" className={cls(mode === 'register' && 'active')} onClick={() => setMode('register')}>
            {t.login.tabRegister}
          </button>
        </div>

        {err && <div className="err">⚠️ {err}</div>}

        {mode === 'register' && (
          <Field label={t.login.fullName}>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.login.fullNamePlaceholder} required />
          </Field>
        )}
        <Field label={t.login.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.login.emailPlaceholder} required />
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

        <Button variant="primary" block disabled={busy}>
          {busy ? t.actions.processing : mode === 'login' ? t.login.submitLogin : t.login.submitRegister}
        </Button>
      </form>
    </div>
  );
}
