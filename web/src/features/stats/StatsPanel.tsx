import { useEffect, useState } from 'react';
import type { Grid, Week } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui';

export function StatsPanel({ grid, weeks }: { grid: Grid; weeks: Week[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(timer);
  }, []);

  const memberStats = grid.members
    .map((m) => ({ name: m.fullName, s: m.servings }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const maxMember = Math.max(1, ...memberStats.map((x) => x.s));
  const maxDay = Math.max(1, ...DAYS.map((d) => grid.totals.perDay[d.key]));
  const trend = [...weeks].reverse().map((w) => ({ label: w.label.split(' ')[0], s: w.servings ?? 0 }));
  const maxTrend = Math.max(1, ...trend.map((x) => x.s));

  return (
    <>
      <Card>
        <CardHeader icon="📊" title={t.stats.byMember} />
        <CardBody>
          {memberStats.length === 0 ? (
            <EmptyState icon="📊">{t.stats.noData}</EmptyState>
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
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon="📆" title={t.stats.byDay} />
        <CardBody>
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
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon="📈" title={t.stats.trend} />
        <CardBody>
          <div className="daycols" style={{ height: 130 }}>
            {trend.map((x, i) => (
              <div className="daycol" key={i}>
                <div
                  className="vb"
                  style={{
                    height: mounted ? `${(x.s / maxTrend) * 100}%` : 0,
                    background: 'linear-gradient(180deg,#34d27b,#22c55e)',
                  }}
                >
                  <span className="n">{x.s}</span>
                </div>
                <span className="lab" style={{ fontSize: 10 }}>
                  {x.label}
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
