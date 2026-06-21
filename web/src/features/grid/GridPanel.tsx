import { useState } from 'react';
import { api } from '@/services/api';
import type { DayKey, Grid, GridMember } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cls, vnd } from '@/lib/format';
import { exportGridCSV } from '@/lib/csv';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Avatar, Button, Card, CardBody, CardHeader, toast } from '@/components/ui';

export function GridPanel({
  grid,
  isAdmin,
  meId,
  reload,
}: {
  grid: Grid;
  isAdmin: boolean;
  meId: string;
  reload: () => Promise<void>;
}) {
  const { week, members, totals } = grid;
  const locked = grid.lockedDays ?? ({} as Record<DayKey, boolean>);
  const dates = grid.dates ?? ({} as Record<DayKey, string | null>);
  const isMobile = useIsMobile();

  const [saving, setSaving] = useState(false);
  const [day, setDay] = useState<DayKey>(() => DAYS.find((d) => !locked[d.key])?.key ?? 'mon');

  /** Có được sửa ô (member, ngày) không: tự mình/admin VÀ (admin hoặc ngày chưa khoá). */
  const canEditDay = (m: GridMember, key: DayKey) =>
    (isAdmin || m.userId === meId) && (isAdmin || !locked[key]);

  const toggle = async (m: GridMember, key: DayKey) => {
    if (!canEditDay(m, key) || saving) return;
    const days = { ...m.days, [key]: !m.days[key] };
    setSaving(true);
    try {
      if (m.userId === meId) await api.setMyDays(week.id, days);
      else await api.setUserDays(m.userId, week.id, days);
      await reload();
    } catch (e: any) {
      toast(e.message || t.errors.save, '⚠️');
    } finally {
      setSaving(false);
    }
  };

  /** Ô của chính mình bị khoá (member, không phải admin). */
  const lockMine = (m: GridMember, key: DayKey) => !isAdmin && m.userId === meId && locked[key];

  /** Nội dung 1 ô tick: 🔒 nếu là ô của mình bị khoá & chưa tích, còn lại ✓. */
  const cellMark = (m: GridMember, key: DayKey, on: boolean) => (lockMine(m, key) && !on ? '🔒' : '✓');

  const cellClass = (m: GridMember, key: DayKey, on: boolean) =>
    cls('cell', on && 'on', canEditDay(m, key) ? 'clickable' : 'ro', lockMine(m, key) && 'locked');

  return (
    <Card>
      <CardHeader icon="🗓️" title={t.grid.title} />
      <div className="hint" style={{ margin: '14px 20px 0' }}>
        {t.grid.hintLead}
        {isAdmin ? t.grid.hintAdmin : t.grid.hintMember}
      </div>
      {grid.cutoff && (
        <div className="hint lock" style={{ margin: '10px 20px 0' }}>
          {t.grid.lockHint(grid.cutoff.label)}
        </div>
      )}

      {isMobile ? (
        /* ===== MOBILE: chọn ngày → danh sách thành viên ===== */
        <CardBody>
          <div className="day-picker">
            {DAYS.map((d) => (
              <button
                key={d.key}
                className={cls('dp', day === d.key && 'active', locked[d.key] && 'lk')}
                onClick={() => setDay(d.key)}
              >
                <span className="dpd">{d.label}</span>
                {dates[d.key] && <span className="dpsub">{dates[d.key]}</span>}
                {locked[d.key] && <span className="dplock">🔒</span>}
              </button>
            ))}
          </div>

          <div className="day-head">
            <b>
              {DAYS.find((d) => d.key === day)?.full}
              {dates[day] ? ` • ${dates[day]}` : ''}
            </b>
            <span className="small muted">{t.grid.eatingDay(totals.perDay[day])}</span>
          </div>

          <div className="day-list">
            {members.map((m) => {
              const on = m.days[day];
              const editable = canEditDay(m, day);
              return (
                <div key={m.userId} className={cls('dayrow', m.userId === meId && 'me')}>
                  <Avatar name={m.fullName} color={m.color} size={36} />
                  <span className="nm">{m.fullName}</span>
                  <button
                    className={cls('daytick', on && 'on', !editable && 'ro', lockMine(m, day) && 'locked')}
                    onClick={() => toggle(m, day)}
                  >
                    {cellMark(m, day, on)}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="day-foot">
            <span className="muted small">{saving ? t.actions.saving : t.grid.autoSave}</span>
            <b>{t.grid.dayTotal(totals.perDay[day])}</b>
          </div>
        </CardBody>
      ) : (
        /* ===== DESKTOP: bảng đầy đủ ===== */
        <CardBody flush>
          <div className="grid-scroll">
            <table className="grid">
              <thead>
                <tr>
                  <th className="col-name">{t.grid.colMember}</th>
                  {DAYS.map((d) => (
                    <th key={d.key} className={cls(locked[d.key] && 'lk')}>
                      {d.label}
                      {dates[d.key] && <span className="dcol">{dates[d.key]}</span>}
                      {locked[d.key] && <span className="dcol lock">🔒</span>}
                    </th>
                  ))}
                  <th>{t.grid.colServings}</th>
                  <th>{t.grid.colMoney}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className={cls(m.userId === meId && 'me')}>
                    <td className="col-name">
                      <div className="namecell">
                        <Avatar name={m.fullName} color={m.color} size={30} />
                        <span>{m.fullName}</span>
                      </div>
                    </td>
                    {DAYS.map((d) => {
                      const on = m.days[d.key];
                      return (
                        <td key={d.key} className="day">
                          <div className={cellClass(m, d.key, on)} onClick={() => toggle(m, d.key)}>
                            {cellMark(m, d.key, on)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="num">{m.servings}</td>
                    <td className="money">{vnd(m.servings * week.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="col-name">{t.grid.totalRow}</td>
                  {DAYS.map((d) => (
                    <td key={d.key}>{totals.perDay[d.key]}</td>
                  ))}
                  <td>{totals.totalServings}</td>
                  <td className="money">{vnd(totals.totalMoney)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardBody>
      )}

      <div className="gridfooter">
        <span className="small muted">{saving ? t.actions.saving : t.grid.autoSave}</span>
        <Button
          tiny
          onClick={() => {
            exportGridCSV(grid);
            toast(t.grid.exported, '📊');
          }}
        >
          {t.grid.exportBtn}
        </Button>
      </div>
    </Card>
  );
}
