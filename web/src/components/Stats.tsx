import { useEffect, useState } from 'react';
import type { Grid, Week } from '../types';
import { DAYS } from '../util';

export function StatsPanel({ grid, weeks }: { grid: Grid; weeks: Week[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const memberStats = grid.members
    .map((m) => ({ name: m.fullName, s: m.servings }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const maxMember = Math.max(1, ...memberStats.map((x) => x.s));
  const maxDay = Math.max(1, ...DAYS.map((d) => grid.totals.perDay[d.key]));
  const trend = [...weeks].reverse().map((w) => ({ label: w.label.split(' ')[0], s: w.servings ?? 0 }));
  const maxTrend = Math.max(1, ...trend.map((t) => t.s));

  return (
    <>
      <div className="card">
        <div className="card-h">
          <div className="ic">📊</div>
          <h2>Suất theo thành viên</h2>
        </div>
        <div className="card-b">
          {memberStats.length === 0 ? (
            <div className="empty">
              <div className="e">📊</div>
              Chưa có dữ liệu
            </div>
          ) : (
            memberStats.map((x) => (
              <div className="bar-row" key={x.name}>
                <span className="nm">{x.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: mounted ? `${(x.s / maxMember) * 100}%` : 0 }}>
                    {x.s}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div className="ic">📆</div>
          <h2>Suất theo ngày</h2>
        </div>
        <div className="card-b">
          <div className="daycols">
            {DAYS.map((d) => {
              const c = grid.totals.perDay[d.key];
              return (
                <div className="daycol" key={d.key}>
                  <div className="vb" style={{ height: mounted ? `${(c / maxDay) * 100}%` : 0 }}>
                    <span className="n">{c}</span>
                  </div>
                  <span className="lab">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div className="ic">📈</div>
          <h2>Xu hướng các tuần</h2>
        </div>
        <div className="card-b">
          <div className="daycols" style={{ height: 130 }}>
            {trend.map((t, i) => (
              <div className="daycol" key={i}>
                <div
                  className="vb"
                  style={{ height: mounted ? `${(t.s / maxTrend) * 100}%` : 0, background: 'linear-gradient(180deg,#34d27b,#22c55e)' }}
                >
                  <span className="n">{t.s}</span>
                </div>
                <span className="lab" style={{ fontSize: 10 }}>
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
