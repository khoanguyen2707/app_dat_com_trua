import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/constants/strings';
import { Button } from '@/components/ui';
import { VersionTag } from '@/components/layout/VersionTag';

/** "Thứ Năm, 24/9" — phiếu cơm luôn ghi ngày hôm nay. */
function todayLabel() {
  const d = new Date();
  const weekday = d.toLocaleDateString('vi-VN', { weekday: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Màn đăng nhập — chỉ đăng nhập, không có đăng ký: tài khoản do admin tạo trong
 * Cài đặt › Thành viên, để ai đặt cơm cũng là người nhóm biết và đòi tiền được.
 *
 * Form được vẽ như một tấm phiếu cơm (mép răng cưa ở đường xé) — chi tiết duy nhất
 * mang tính trang trí; mọi thứ khác giữ phẳng và dùng đúng token của app.
 */
export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setErr(e.message || t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'h-11 w-full rounded-ui border border-line-strong bg-surface px-3.5 text-[15px] outline-none transition-colors placeholder:text-ink-4 focus:border-brand focus:ring-4 focus:ring-brand/10';

  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Panel thương hiệu: trên mobile co lại thành phần đầu trang. */}
      <section className="relative overflow-hidden bg-brand px-6 pb-16 pt-10 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="grid size-9 place-items-center rounded-ui bg-white/15">
            <UtensilsCrossed className="size-[18px]" />
          </span>
          {t.app.name}
        </div>

        <div className="mt-10 lg:mt-0">
          <h1 className="whitespace-pre-line text-[44px] font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-[64px] lg:text-[88px]">
            {t.login.heroTitle}
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/85 lg:text-base">{t.login.heroLead}</p>
        </div>

        {/* Ba bước thật sự nối tiếp nhau trong ngày nên mới đánh số. */}
        <ol className="mt-10 hidden max-w-md gap-3 lg:grid">
          {t.login.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-[15px]">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/40 text-[13px] font-semibold">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        {/* Chiếc bát lớn chìm ở góc — nhận diện, không mang thông tin. */}
        <UtensilsCrossed
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-16 size-72 text-white/[0.07] lg:size-[26rem]"
          strokeWidth={1.25}
        />
      </section>

      <section className="-mt-10 flex items-start justify-center px-4 pb-10 lg:mt-0 lg:items-center lg:px-10">
        <form
          onSubmit={submit}
          className="relative w-full max-w-[400px] motion-safe:animate-[ticket-in_0.5s_cubic-bezier(0.2,0.8,0.2,1)]"
        >
          <div className="ticket rounded-ui-lg bg-surface shadow-pop">
            {/* Cuống phiếu */}
            <div className="flex items-baseline justify-between px-7 pb-5 pt-6">
              <h2 className="text-xl font-bold tracking-tight">{t.login.ticketTitle}</h2>
              <span className="tnum text-[13px] text-ink-3">{t.login.ticketNo(todayLabel())}</span>
            </div>

            <div className="ticket-tear" aria-hidden="true" />

            <div className="px-7 pb-7 pt-6">
              {err && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-ui border border-danger-line bg-danger-soft px-3 py-2 text-[13px] text-danger"
                >
                  <AlertCircle className="mt-px size-4 shrink-0" />
                  {err}
                </div>
              )}

              <label className="mb-1.5 block text-[13px] font-medium text-ink-2" htmlFor="login-email">
                {t.login.email}
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                autoFocus
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.login.emailPlaceholder}
                required
              />

              <label className="mb-1.5 mt-4 block text-[13px] font-medium text-ink-2" htmlFor="login-password">
                {t.login.password}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`${inputCls} pr-11`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-ui text-ink-4 hover:text-ink focus-visible:text-brand focus-visible:outline-none"
                  aria-label={show ? t.login.hidePassword : t.login.showPassword}
                  aria-pressed={show}
                >
                  {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>

              <Button variant="primary" block loading={busy} className="mt-6 h-11 text-[15px]">
                {t.login.submitLogin}
              </Button>

              <p className="mt-5 text-[13px] leading-relaxed text-ink-3">{t.login.noAccount}</p>
            </div>
          </div>

          <VersionTag className="mt-4 text-center" />
        </form>
      </section>
    </div>
  );
}
