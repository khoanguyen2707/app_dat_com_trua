import { useState } from 'react';
import { useAuth } from '../auth';

export function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
      setErr(e.message || 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">🍱</div>
        <h1 className="center" style={{ fontSize: 22 }}>
          Đặt Cơm Trưa
        </h1>
        <p className="center muted small" style={{ marginTop: 4 }}>
          {mode === 'login' ? 'Đăng nhập để đăng ký suất ăn' : 'Tạo tài khoản mới (quyền thành viên)'}
        </p>

        <div className="seg">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Đăng nhập
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Đăng ký
          </button>
        </div>

        {err && <div className="err">⚠️ {err}</div>}

        {mode === 'register' && (
          <div className="field">
            <label>Họ tên</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Anh Khoa" required />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" required />
        </div>
        <div className="field">
          <label>Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            minLength={6}
            required
          />
        </div>

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </form>
    </div>
  );
}
