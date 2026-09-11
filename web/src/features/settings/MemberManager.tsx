import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { MEMBER_COLORS } from '@/constants/config';
import { t } from '@/constants/strings';
import type { PickupStat, Role, User } from '@/types';
import { cls } from '@/lib/format';
import { Avatar, Button, confirmDialog, Field, toast } from '@/components/ui';

/** Các trường admin sửa được trong panel chi tiết. */
type Draft = { fullName: string; teamsEmail: string; color: string };

const draftOf = (u: User): Draft => ({
  fullName: u.fullName,
  teamsEmail: u.teamsEmail ?? '',
  color: u.color ?? MEMBER_COLORS[0],
});

/** '2026-09-11' -> '11/9' (chuỗi ngày từ server luôn là YYYY-MM-DD theo lịch VN). */
function shortDate(iso: string | null): string | null {
  const m = iso && /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${+m[3]}/${+m[2]}` : null;
}

/** Bỏ dấu tiếng Việt để tìm kiếm gõ không dấu vẫn ra ("huong" khớp "Hương"). */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Công tắc bật/tắt kèm mô tả trạng thái hiện tại. */
function Switch({
  label,
  hint,
  on,
  danger,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  danger?: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="mm-sw" onClick={onToggle} role="switch" aria-checked={on}>
      <span className="mm-sw-txt">
        <b>{label}</b>
        <span className="muted small">{hint}</span>
      </span>
      <span className={cls('mm-sw-track', on && 'on', on && danger && 'danger')} aria-hidden="true">
        <span className="mm-sw-knob" />
      </span>
    </button>
  );
}

export function MemberManager({ onChanged }: { onChanged: () => void }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<PickupStat[]>([]);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.users().then(setUsers).catch(() => {});
    // Bảng xoay tua chỉ để tham khảo — hỏng thì phần quản lý thành viên vẫn dùng được.
    api.pickupStats().then(setStats).catch(() => setStats([]));
  }, []);

  const statsBy = useMemo(() => new Map(stats.map((s) => [s.userId, s])), [stats]);

  /**
   * Thứ hạng "sắp tới lượt" — chỉ xếp người THỰC SỰ nằm trong xoay tua:
   * bỏ người miễn lấy cơm / bị khoá, và bỏ người chưa đặt cơm ngày nào (vd tài khoản
   * admin không ăn trưa) vì họ không bao giờ lọt vào danh sách bốc.
   *
   * `stats` đã được server sắp theo rate tăng dần nên chỉ cần lọc rồi đánh số. Cờ
   * optOut/active lấy từ `users` (state sống) chứ KHÔNG lấy từ `stats` (ảnh chụp lúc
   * mở modal): bật "miễn lấy cơm" hay xoá người phải đổi thứ hạng ngay, không cần tải lại.
   */
  const queueRank = useMemo(() => {
    const byId = new Map(users.map((u) => [u.id, u]));
    const inRotation = stats.filter((s) => {
      const u = byId.get(s.userId);
      return u && u.active && !u.pickupOptOut && s.orderCount > 0;
    });
    return new Map(inRotation.map((s, i) => [s.userId, i + 1]));
  }, [stats, users]);

  const shown = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return users;
    return users.filter((u) => fold(u.fullName).includes(needle) || fold(u.email).includes(needle));
  }, [users, q]);

  const counts = useMemo(
    () => ({
      locked: users.filter((u) => !u.active).length,
      noTeams: users.filter((u) => !u.teamsEmail).length,
      optOut: users.filter((u) => u.pickupOptOut).length,
    }),
    [users],
  );

  const toggleOpen = (u: User) => {
    if (openId === u.id) {
      setOpenId(null);
      setDraft(null);
      return;
    }
    setOpenId(u.id);
    setDraft(draftOf(u));
  };

  /**
   * Ghi 1 thay đổi lên server + đồng bộ lại state tại chỗ (không phải tải lại cả danh sách).
   *
   * `onChanged()` chỉ ĐÁNH DẤU là có thay đổi — màn hình nền được tải lại một lần duy nhất
   * lúc đóng Cài đặt, vì nó đang bị modal che kín nên cập nhật ngay là vô ích.
   */
  const patch = async (u: User, data: Partial<User>, done?: string) => {
    setBusy(true);
    try {
      const saved = await api.updateUser(u.id, data);
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, ...saved } : x)));
      if (done) toast(done, '✅');
      onChanged();
      return true;
    } catch (e: any) {
      toast(e.message || t.errors.save, '⚠️');
      return false;
    } finally {
      setBusy(false);
    }
  };

  /**
   * Đổi quyền quản trị — LUÔN hỏi lại. Đây là công tắc nguy hiểm nhất trong màn hình
   * (cấp quyền = trao toàn quyền lên mọi tài khoản khác; bỏ quyền của chính mình = tự
   * khoá mình khỏi Cài đặt, không có đường tự cấp lại).
   */
  const toggleRole = async (u: User) => {
    const toAdmin = u.role !== 'ADMIN';
    const self = u.id === me?.id;
    const ok = await confirmDialog({
      title: t.member.confirmRoleTitle,
      message: toAdmin
        ? t.member.confirmGrant(u.fullName)
        : self
          ? t.member.confirmRevokeSelf
          : t.member.confirmRevoke(u.fullName),
      confirmLabel: toAdmin ? t.member.grantBtn : t.member.revokeBtn,
      danger: !toAdmin,
    });
    if (!ok) return;
    await patch(
      u,
      { role: (toAdmin ? 'ADMIN' : 'USER') as Role },
      toAdmin ? t.member.roleGranted(u.fullName) : t.member.roleRevoked(u.fullName),
    );
  };

  /** Khoá tài khoản thì hỏi lại (chặn đăng nhập); mở khoá thì làm luôn — vô hại, gạt lại được. */
  const toggleActive = async (u: User) => {
    if (u.active) {
      const ok = await confirmDialog({
        title: t.member.confirmLockTitle,
        message: u.id === me?.id ? t.member.confirmLockSelf : t.member.confirmLock(u.fullName),
        confirmLabel: t.member.lockBtn,
        danger: true,
      });
      if (!ok) return;
    }
    await patch(
      u,
      { active: !u.active },
      u.active ? t.member.lockedToast(u.fullName) : t.member.unlockedToast(u.fullName),
    );
  };

  const toggleOptOut = async (u: User) => {
    await patch(
      u,
      { pickupOptOut: !u.pickupOptOut },
      u.pickupOptOut ? t.member.optOutOffToast(u.fullName) : t.member.optOutOnToast(u.fullName),
    );
  };

  const save = async (u: User) => {
    if (!draft) return;
    const fullName = draft.fullName.trim();
    if (!fullName) return toast(t.member.nameRequired, '✏️');
    const teams = draft.teamsEmail.trim();
    // null (không phải '') khi bỏ trống: pickup dùng `teamsEmail ?? email` nên '' sẽ thành mention rỗng.
    const ok = await patch(u, { fullName, teamsEmail: teams || null, color: draft.color }, t.member.saved);
    if (ok) {
      setOpenId(null);
      setDraft(null);
    }
  };

  const remove = async (u: User) => {
    if (u.id === me?.id) return toast(t.member.cannotDeleteSelf, '⚠️');
    const ok = await confirmDialog({
      title: t.member.confirmDeleteTitle,
      message: t.member.confirmDelete(u.fullName),
      confirmLabel: t.member.deleteBtn,
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteUser(u.id);
      setUsers((us) => us.filter((x) => x.id !== u.id));
      setOpenId(null);
      setDraft(null);
      onChanged();
      toast(t.settings.removed, '🗑️');
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mm-top">
        <h4>{t.settings.members(users.length)}</h4>
        <div className="mm-sum small muted">
          {counts.locked > 0 && <span className="mm-sum-i">{t.member.sumLocked(counts.locked)}</span>}
          {counts.optOut > 0 && <span className="mm-sum-i">{t.member.sumOptOut(counts.optOut)}</span>}
          {counts.noTeams > 0 && <span className="mm-sum-i warn">{t.member.sumNoTeams(counts.noTeams)}</span>}
        </div>
      </div>

      <input
        className="mm-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.member.searchPlaceholder}
        aria-label={t.member.searchPlaceholder}
      />

      {shown.length === 0 && <div className="muted small mm-empty">{t.member.none}</div>}

      <div className="mm-list">
        {shown.map((u) => {
          const open = openId === u.id;
          const s = statsBy.get(u.id);
          const rank = queueRank.get(u.id);
          return (
            <div className={cls('mm-item', open && 'open')} key={u.id}>
              <button type="button" className="mm-head" onClick={() => toggleOpen(u)} aria-expanded={open}>
                <Avatar name={u.fullName} color={u.color} size={34} />
                <span className="mm-id">
                  <span className="mm-line1">
                    <span className="mm-name">{u.fullName}</span>
                    <span className={cls('pill', u.role === 'ADMIN' ? 'admin' : 'user')}>{u.role}</span>
                    <span className="mm-caret" aria-hidden="true">
                      {open ? '▴' : '▾'}
                    </span>
                  </span>
                  <span className="mm-meta">
                    <span className="muted small mm-mail">{u.teamsEmail || u.email}</span>
                    {rank != null && <span className="mm-badge rank">{t.member.queueRank(rank)}</span>}
                    {u.id === me?.id && <span className="mm-badge">{t.member.badgeYou}</span>}
                    {!u.active && <span className="mm-badge off">{t.member.badgeLocked}</span>}
                    {u.pickupOptOut && <span className="mm-badge">{t.member.badgeOptOut}</span>}
                    {!u.teamsEmail && <span className="mm-badge warn">{t.member.badgeNoTeams}</span>}
                  </span>
                </span>
              </button>

              {open && draft && (
                <div className="mm-panel">
                  <div className="mm-cols">
                    <Field label={t.member.fieldFullName}>
                      <input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
                    </Field>
                    <Field label={t.member.fieldTeamsEmail}>
                      <input
                        type="email"
                        value={draft.teamsEmail}
                        placeholder={t.member.teamsPlaceholder}
                        onChange={(e) => setDraft({ ...draft, teamsEmail: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="mm-hint small muted">{t.member.teamsHint}</div>

                  <Field label={t.member.fieldColor}>
                    <div className="mm-colors">
                      {MEMBER_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          className={cls('mm-color', draft.color.toLowerCase() === c.toLowerCase() && 'on')}
                          style={{ background: c }}
                          onClick={() => setDraft({ ...draft, color: c })}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </Field>

                  <div className="mm-switches">
                    <Switch
                      label={t.member.optActive}
                      hint={u.active ? t.member.optActiveOn : t.member.optActiveOff}
                      on={!!u.active}
                      onToggle={() => void toggleActive(u)}
                    />
                    <Switch
                      label={t.member.optRole}
                      hint={u.role === 'ADMIN' ? t.member.optRoleOn : t.member.optRoleOff}
                      on={u.role === 'ADMIN'}
                      onToggle={() => void toggleRole(u)}
                    />
                    <Switch
                      label={t.member.optOptOut}
                      hint={u.pickupOptOut ? t.member.optOptOutOn : t.member.optOptOutOff}
                      on={!!u.pickupOptOut}
                      danger
                      onToggle={() => void toggleOptOut(u)}
                    />
                  </div>

                  <div className="mm-stats-h small">
                    <b>{t.member.statsTitle}</b>
                    {rank != null && <span className="mm-rank small">{t.member.queueRank(rank)}</span>}
                  </div>
                  {u.pickupOptOut ? (
                    <div className="mm-stats-note small muted">{t.member.statsOptOut}</div>
                  ) : !s || s.orderCount === 0 ? (
                    <div className="mm-stats-note small muted">{t.member.statsEmpty}</div>
                  ) : (
                    <div className="mm-stats">
                      <div className="mm-stat">
                        <span className="k">{t.member.statOrders}</span>
                        <b>{t.member.statDays(s.orderCount)}</b>
                      </div>
                      <div className="mm-stat">
                        <span className="k">{t.member.statPickups}</span>
                        <b>{t.member.statTimes(s.pickupCount)}</b>
                      </div>
                      <div className="mm-stat">
                        <span className="k">{t.member.statRate}</span>
                        <b>{s.rawRate == null ? '—' : `${Math.round(s.rawRate * 100)}%`}</b>
                      </div>
                      <div className="mm-stat">
                        <span className="k">{t.member.statLast}</span>
                        <b>{shortDate(s.lastPickup) ?? t.member.statNever}</b>
                      </div>
                    </div>
                  )}

                  <div className="mm-acts">
                    <Button variant="danger" tiny onClick={() => remove(u)} disabled={busy || u.id === me?.id}>
                      {t.actions.delete}
                    </Button>
                    <div className="spacer" />
                    <Button tiny onClick={() => toggleOpen(u)}>
                      {t.actions.cancel}
                    </Button>
                    <Button variant="primary" tiny loading={busy} onClick={() => save(u)}>
                      {t.actions.save}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
