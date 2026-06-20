import { useState } from 'react';
import { api } from '../api';
import type { Grid, GridMember } from '../types';
import { DAYS, cls, initials, vnd } from '../util';
import { toast } from '../ui';

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
  const [saving, setSaving] = useState(false);
  const { week, members, totals } = grid;

  const canEdit = (m: GridMember) => isAdmin || m.userId === meId;

  const toggle = async (m: GridMember, day: string) => {
    if (!canEdit(m) || saving) return;
    const days = { ...m.days, [day]: !m.days[day as keyof typeof m.days] };
    setSaving(true);
    try {
      if (m.userId === meId) await api.setMyDays(week.id, days);
      else await api.setUserDays(m.userId, week.id, days);
      await reload();
    } catch (e: any) {
      toast(e.message || 'Lỗi lưu', '⚠️');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const head = ['STT', 'Tên', ...DAYS.map((d) => d.label), 'Số suất', 'Thành tiền'];
    const rows = members.map((m, i) => [
      i + 1,
      m.fullName,
      ...DAYS.map((d) => (m.days[d.key] ? 'x' : '')),
      m.servings,
      m.servings * week.unitPrice,
    ]);
    rows.push(['', 'TỔNG', ...DAYS.map((d) => totals.perDay[d.key]), totals.totalServings, totals.totalMoney]);
    const csv = '﻿' + [head, ...rows].map((r) => r.map((c) => `"${String(c)}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `com-trua_${week.label.replace(/[^\d]/g, '-')}.csv`;
    a.click();
    toast('Đã xuất Excel (CSV)', '📊');
  };

  return (
    <div className="card">
      <div className="card-h">
        <div className="ic">🗓️</div>
        <h2>Bảng đăng ký tuần</h2>
      </div>
      <div className="hint" style={{ margin: '14px 20px 0' }}>
        💡 Chạm ô ngày bạn ăn. {isAdmin ? 'Admin có thể tích hộ mọi người.' : 'Bạn chỉ sửa được dòng của mình.'}
      </div>
      <div className="card-b flush">
        <div className="grid-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th className="col-name">Thành viên</th>
                {DAYS.map((d) => (
                  <th key={d.key}>{d.label}</th>
                ))}
                <th>Số suất</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId} className={m.userId === meId ? 'me' : ''}>
                  <td className="col-name">
                    <div className="namecell">
                      <span className="avatar" style={{ background: m.color || '#0a84ff' }}>
                        {initials(m.fullName)}
                      </span>
                      <span>{m.fullName}</span>
                    </div>
                  </td>
                  {DAYS.map((d) => (
                    <td key={d.key} className="day">
                      <div
                        className={cls('cell', m.days[d.key] && 'on', canEdit(m) ? 'clickable' : 'ro')}
                        onClick={() => toggle(m, d.key)}
                      >
                        ✓
                      </div>
                    </td>
                  ))}
                  <td className="num">{m.servings}</td>
                  <td className="money">{vnd(m.servings * week.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="col-name">TỔNG CỘNG</td>
                {DAYS.map((d) => (
                  <td key={d.key}>{totals.perDay[d.key]}</td>
                ))}
                <td>{totals.totalServings}</td>
                <td className="money">{vnd(totals.totalMoney)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div className="gridfooter">
        <span className="small muted">{saving ? 'Đang lưu…' : 'Tự động lưu khi tích'}</span>
        <button className="btn tiny" onClick={exportCSV}>
          📊 Xuất Excel
        </button>
      </div>
    </div>
  );
}
