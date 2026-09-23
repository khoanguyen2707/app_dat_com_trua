import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { MEMBER_COLORS } from '@/constants/config';
import { t } from '@/constants/strings';
import type { PickupStat, Role, User } from '@/types';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, Button, confirmDialog, Field, Pill, toast } from '@/components/ui';

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
  disabled,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  danger?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-ui border border-line px-3 py-2 text-left transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      disabled={disabled}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="text-[13px] font-medium">{label}</b>
        <span className="text-[12px] text-ink-3">{hint}</span>
      </span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          on ? (danger ? 'bg-danger' : 'bg-brand') : 'bg-line-strong',
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-white transition-[left]',
            on ? 'left-[1.125rem]' : 'left-0.5',
          )}
        />
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

  /**
   * Số admin đang hoạt động. Server từ chối hạ quyền / khoá / xoá người admin đang hoạt động
   * CUỐI CÙNG (giữ cho app luôn còn người quản trị); ở đây khoá sẵn công tắc để không ai bấm
   * vào rồi mới ăn lỗi.
   */
  const activeAdmins = useMemo(() => users.filter((u) => u.role === 'ADMIN' && u.active).length, [users]);
  const isLastAdmin = (u: User) => u.role === 'ADMIN' && !!u.active && activeAdmins <= 1;

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
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-sm font-semibold">{t.settings.members(users.length)}</h4>
        <div className="flex flex-wrap gap-x-3 text-[12px] text-ink-3">
          {counts.locked > 0 && <span>{t.member.sumLocked(counts.locked)}</span>}
          {counts.optOut > 0 && <span>{t.member.sumOptOut(counts.optOut)}</span>}
          {counts.noTeams > 0 && <span className="text-warn">{t.member.sumNoTeams(counts.noTeams)}</span>}
        </div>
      </div>

      <div className="relative my-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-4" />
        <input
          className="h-9 w-full rounded-ui border border-line bg-surface pl-8 pr-3 text-sm outline-none focus:border-brand"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.member.searchPlaceholder}
          aria-label={t.member.searchPlaceholder}
        />
      </div>

      {shown.length === 0 && <div className="py-6 text-center text-[13px] text-ink-3">{t.member.none}</div>}

      <div className="divide-y divide-line overflow-hidden rounded-ui-md border border-line">
        {shown.map((u) => {
          const open = openId === u.id;
          const s = statsBy.get(u.id);
          const rank = queueRank.get(u.id);
          const lastAdmin = isLastAdmin(u);
          return (
            <div className={cn(open && 'bg-subtle/50')} key={u.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-subtle/60"
                onClick={() => toggleOpen(u)}
                aria-expanded={open}
              >
                <Avatar name={u.fullName} color={u.color} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{u.fullName}</span>
                    <Pill kind={u.role === 'ADMIN' ? 'admin' : 'user'}>{u.role}</Pill>
                    <ChevronDown
                      className={cn('ml-auto size-4 shrink-0 text-ink-4 transition-transform', open && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[12px] text-ink-3">{u.teamsEmail || u.email}</span>
                    {rank != null && <span className="rounded-full border border-line bg-subtle px-1.5 py-px text-[11px] text-ink-3">{t.member.queueRank(rank)}</span>}
                    {u.id === me?.id && <span className="rounded-full border border-line bg-subtle px-1.5 py-px text-[11px] text-ink-3">{t.member.badgeYou}</span>}
                    {lastAdmin && <span className="rounded-full border border-line bg-subtle px-1.5 py-px text-[11px] text-ink-3">{t.member.badgeLastAdmin}</span>}
                    {!u.active && <span className="rounded-full border border-line-strong bg-subtle px-1.5 py-px text-[11px] text-ink-2">{t.member.badgeLocked}</span>}
                    {u.pickupOptOut && <span className="rounded-full border border-line bg-subtle px-1.5 py-px text-[11px] text-ink-3">{t.member.badgeOptOut}</span>}
                    {!u.teamsEmail && <span className="rounded-full border border-warn-line bg-warn-soft px-1.5 py-px text-[11px] text-warn">{t.member.badgeNoTeams}</span>}
                  </span>
                </span>
              </button>

              {open && draft && (
                <div className="border-t border-line px-3 py-3">
                  <div className="grid gap-x-3 sm:grid-cols-2">
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
                  <div className="-mt-1 mb-3 text-[12px] text-ink-3">{t.member.teamsHint}</div>

                  <Field label={t.member.fieldColor}>
                    <div className="flex flex-wrap gap-1.5">
                      {MEMBER_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          className={cn(
                            'size-6 rounded-full border-2 transition-[border-color]',
                            draft.color.toLowerCase() === c.toLowerCase() ? 'border-ink' : 'border-transparent',
                          )}
                          style={{ background: c }}
                          onClick={() => setDraft({ ...draft, color: c })}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </Field>

                  <div className="flex flex-col gap-1.5">
                    <Switch
                      label={t.member.optActive}
                      hint={lastAdmin ? t.member.lastAdminHint : u.active ? t.member.optActiveOn : t.member.optActiveOff}
                      on={!!u.active}
                      disabled={lastAdmin}
                      onToggle={() => void toggleActive(u)}
                    />
                    <Switch
                      label={t.member.optRole}
                      hint={
                        lastAdmin ? t.member.lastAdminHint : u.role === 'ADMIN' ? t.member.optRoleOn : t.member.optRoleOff
                      }
                      on={u.role === 'ADMIN'}
                      disabled={lastAdmin}
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

                  <div className="mb-1.5 mt-4 flex items-center gap-2 text-[13px]">
                    <b>{t.member.statsTitle}</b>
                    {rank != null && <span className="text-[12px] text-ink-3">{t.member.queueRank(rank)}</span>}
                  </div>
                  {u.pickupOptOut ? (
                    <div className="text-[13px] text-ink-3">{t.member.statsOptOut}</div>
                  ) : !s || s.orderCount === 0 ? (
                    <div className="text-[13px] text-ink-3">{t.member.statsEmpty}</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="flex flex-col rounded-ui border border-line px-2.5 py-1.5">
                        <span className="text-[11px] uppercase tracking-wide text-ink-4">{t.member.statOrders}</span>
                        <b>{t.member.statDays(s.orderCount)}</b>
                      </div>
                      <div className="flex flex-col rounded-ui border border-line px-2.5 py-1.5">
                        <span className="text-[11px] uppercase tracking-wide text-ink-4">{t.member.statPickups}</span>
                        <b>{t.member.statTimes(s.pickupCount)}</b>
                      </div>
                      <div className="flex flex-col rounded-ui border border-line px-2.5 py-1.5">
                        <span className="text-[11px] uppercase tracking-wide text-ink-4">{t.member.statRate}</span>
                        <b>{s.rawRate == null ? '—' : `${Math.round(s.rawRate * 100)}%`}</b>
                      </div>
                      <div className="flex flex-col rounded-ui border border-line px-2.5 py-1.5">
                        <span className="text-[11px] uppercase tracking-wide text-ink-4">{t.member.statLast}</span>
                        <b>{shortDate(s.lastPickup) ?? t.member.statNever}</b>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="danger"
                      tiny
                      onClick={() => remove(u)}
                      disabled={busy || u.id === me?.id || lastAdmin}
                      title={lastAdmin ? t.member.lastAdminHint : undefined}
                    >
                      {t.actions.delete}
                    </Button>
                    <div className="flex-1" />
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
