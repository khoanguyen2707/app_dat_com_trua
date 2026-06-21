import { useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { DayKey, Dish, Grid, GridMember } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cls, vnd } from '@/lib/format';
import { exportGridCSV } from '@/lib/csv';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Avatar, Button, Card, CardBody, CardHeader, toast } from '@/components/ui';
import { DayDetailSheet } from './DayDetailSheet';

export function GridPanel({
  grid,
  dishes,
  isAdmin,
  meId,
  reload,
  readOnly = false,
}: {
  grid: Grid;
  dishes: Dish[];
  isAdmin: boolean;
  meId: string;
  reload: () => Promise<void>;
  /** Lịch sử: chỉ xem, mọi thao tác sửa bị khoá. */
  readOnly?: boolean;
}) {
  const { week, members, totals } = grid;
  const locked = grid.lockedDays ?? ({} as Record<DayKey, boolean>);
  const dates = grid.dates ?? ({} as Record<DayKey, string | null>);
  const isMobile = useIsMobile();
  const dishMap = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);

  const [saving, setSaving] = useState(false);
  const [day, setDay] = useState<DayKey>(() => DAYS.find((d) => !locked[d.key])?.key ?? 'mon');
  const [picked, setPicked] = useState<{ m: GridMember; day: DayKey } | null>(null);

  /** Có được sửa ô (member, ngày): tự mình/admin VÀ (admin hoặc ngày chưa khoá). */
  const canEditDay = (m: GridMember, key: DayKey) =>
    !readOnly && (isAdmin || m.userId === meId) && (isAdmin || !locked[key]);

  /**
   * Bỏ cơm nhanh 1 ngày: huỷ cơm + món, GIỮ nước.
   * - Còn nước → ô thành "chỉ nước" 🥤 (nền xanh).
   * - Không có nước → ô về trống.
   * Đặt/sửa cơm luôn qua phiếu chi tiết (vì đặt cơm bắt buộc phải chọn món).
   */
  const clearRice = async (m: GridMember, key: DayKey) => {
    if (!canEditDay(m, key) || saving) return;
    const cur = m.items?.[key];
    const detail = { eat: false, food: [], drinks: cur?.drinks ?? [] };
    setSaving(true);
    try {
      if (m.userId === meId) await api.setMyDay(week.id, key, detail);
      else await api.setUserDay(m.userId, week.id, key, detail);
      await reload();
    } catch (e: any) {
      toast(e.message || t.errors.save, '⚠️');
    } finally {
      setSaving(false);
    }
  };

  /** Tap ô → mở phiếu chi tiết (đặt cơm + chọn món / thêm nước). Bỏ cơm nhanh bằng nút × trên ô. */
  const onCell = (m: GridMember, key: DayKey) => {
    if (saving) return;
    if (!readOnly || m.days[key] || m.items?.[key]) setPicked({ m, day: key });
  };

  const lockMine = (m: GridMember, key: DayKey) => !isAdmin && m.userId === meId && locked[key];
  const hasDrink = (m: GridMember, key: DayKey) => (m.items?.[key]?.drinks.length ?? 0) > 0;

  /** Icon ô: 🍚 có cơm · 🥤 chỉ nước · 🔒 khoá (ô trống của mình) · trống. */
  const cellMark = (m: GridMember, key: DayKey) => {
    if (m.days[key]) return '🍚';
    if (hasDrink(m, key)) return '🥤';
    if (lockMine(m, key)) return '🔒';
    return '';
  };
  const cellClass = (m: GridMember, key: DayKey) => {
    const com = m.days[key];
    const drinkOnly = !com && hasDrink(m, key);
    const interactive = canEditDay(m, key) || (!readOnly && (com || m.items?.[key]));
    return cls('cell', com && 'on', drinkOnly && 'drink', interactive ? 'clickable' : 'ro', lockMine(m, key) && 'locked');
  };

  /** Tóm tắt món/nước của 1 ngày (cho mobile row): "🐟 🍳  ·  🥤×2" */
  const summary = (m: GridMember, key: DayKey) => {
    const it = m.items?.[key];
    if (!it) return '';
    const foodEmojis = it.food.map((id) => dishMap.get(id)?.emoji).filter(Boolean).join(' ');
    const drinkN = it.drinks.reduce((a, d) => a + d.qty, 0);
    return [foodEmojis, drinkN > 0 ? `🥤×${drinkN}` : ''].filter(Boolean).join('  ·  ');
  };

  return (
    <Card>
      <CardHeader icon="🗓️" title={t.grid.title} />
      {!readOnly && (
        <div className="grid-guide">
          <div className="grid-guide-h">{t.grid.guide.title}</div>
          <ul>
            <li>{t.grid.guide.order(vnd(week.unitPrice))}</li>
            <li>{t.grid.guide.detail(isMobile ? t.grid.guide.whereMobile : t.grid.guide.whereDesktop)}</li>
            {grid.cutoff && <li>{t.grid.guide.today(grid.cutoff.label)}</li>}
            <li>{t.grid.guide.cancel}</li>
            <li>{t.grid.guide.colors}</li>
            <li>{isAdmin ? t.grid.guide.admin : t.grid.guide.member}</li>
          </ul>
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
              const sub = summary(m, day);
              return (
                <div key={m.userId} className={cls('dayrow', m.userId === meId && 'me')}>
                  <Avatar name={m.fullName} color={m.color} size={36} />
                  <button className="dayrow-info" onClick={() => setPicked({ m, day })}>
                    <span className="nm">{m.fullName}</span>
                    {sub && <span className="dayrow-sub">{sub}</span>}
                  </button>
                  <button
                    className={cls(
                      'daytick',
                      on && 'on',
                      !on && hasDrink(m, day) && 'drink',
                      !canEditDay(m, day) && 'ro',
                      lockMine(m, day) && 'locked',
                    )}
                    onClick={() =>
                      canEditDay(m, day) && on ? clearRice(m, day) : setPicked({ m, day })
                    }
                  >
                    {cellMark(m, day)}
                    {on && hasDrink(m, day) && <span className="cell-drink">🥤</span>}
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
                    {DAYS.map((d) => (
                      <td key={d.key} className="day">
                        <div className={cellClass(m, d.key)} onClick={() => onCell(m, d.key)}>
                          {cellMark(m, d.key)}
                          {m.days[d.key] && hasDrink(m, d.key) && <span className="cell-drink">🥤</span>}
                          {m.days[d.key] && canEditDay(m, d.key) && (
                            <button
                              className="cell-x"
                              title={t.grid.clearRice}
                              onClick={(e) => {
                                e.stopPropagation();
                                clearRice(m, d.key);
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="num">{m.servings}</td>
                    <td className="money">{vnd(m.total)}</td>
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

      {picked && (
        <DayDetailSheet
          grid={grid}
          member={picked.m}
          day={picked.day}
          dishes={dishes}
          isAdmin={isAdmin && !readOnly}
          meId={meId}
          locked={readOnly || !!locked[picked.day]}
          onClose={() => setPicked(null)}
          onSaved={reload}
        />
      )}
    </Card>
  );
}
