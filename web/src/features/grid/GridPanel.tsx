import { useState } from 'react';
import { api } from '@/services/api';
import type { Grid, GridMember } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cls, vnd } from '@/lib/format';
import { exportGridCSV } from '@/lib/csv';
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
      toast(e.message || t.errors.save, '⚠️');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader icon="🗓️" title={t.grid.title} />
      <div className="hint" style={{ margin: '14px 20px 0' }}>
        {t.grid.hintLead}
        {isAdmin ? t.grid.hintAdmin : t.grid.hintMember}
      </div>
      <CardBody flush>
        <div className="grid-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th className="col-name">{t.grid.colMember}</th>
                {DAYS.map((d) => (
                  <th key={d.key}>{d.label}</th>
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
