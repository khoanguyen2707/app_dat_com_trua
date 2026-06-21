import { useState } from 'react';
import type { Grid, GridMember, PaymentConfig } from '@/types';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { vietqr } from '@/lib/vietqr';
import { useDisclosure } from '@/hooks/useDisclosure';
import { Avatar, Button, Card, CardBody, CardHeader, toast } from '@/components/ui';
import { MemberPayModal } from './MemberPayModal';
import { PaymentEditModal } from './PaymentEditModal';

export function PaymentPanel({
  grid,
  payment,
  isAdmin,
  reloadGrid,
  reloadPayment,
}: {
  grid: Grid;
  payment: PaymentConfig;
  isAdmin: boolean;
  reloadGrid: () => Promise<void>;
  reloadPayment: () => Promise<void>;
}) {
  const [picked, setPicked] = useState<GridMember | null>(null);
  const edit = useDisclosure();
  const eating = grid.members.filter((m) => m.total > 0);

  const copy = () => {
    navigator.clipboard?.writeText(payment.accountNumber);
    toast(t.payment.copied, '📋');
  };

  return (
    <Card>
      <CardHeader
        icon="💳"
        title={t.payment.title}
        action={
          isAdmin && (
            <Button tiny onClick={edit.onOpen}>
              {t.actions.edit}
            </Button>
          )
        }
      />
      <CardBody>
        <div className="pay-grid">
          <div className="qr-box">
            <img src={vietqr(payment, undefined, t.payment.qrInfoWeek(grid.week.label))} alt="QR" />
            <div style={{ marginTop: 13, fontWeight: 800, fontSize: 15 }}>{payment.accountHolder}</div>
            <div className="small muted">
              {payment.bankName} • {payment.accountNumber}
            </div>
          </div>
          <div>
            <div className="acct-row">
              <div>
                <div className="k">{t.payment.accountHolder}</div>
                <div className="v">{payment.accountHolder}</div>
              </div>
            </div>
            <div className="acct-row">
              <div>
                <div className="k">{t.payment.bank}</div>
                <div className="v">{payment.bankName}</div>
              </div>
            </div>
            <div className="acct-row">
              <div>
                <div className="k">{t.payment.accountNumber}</div>
                <div className="v">{payment.accountNumber}</div>
              </div>
              <Button tiny variant="primary" onClick={copy}>
                {t.actions.copy}
              </Button>
            </div>
            <div className="hint" style={{ marginTop: 14 }}>
              {t.payment.memberHintLead}
              <b>{t.payment.memberHintBold}</b>
              {t.payment.memberHintTail}
            </div>
            <div className="member-pay">
              {eating.length === 0 && <div className="small muted">{t.payment.noEaters}</div>}
              {eating.map((m) => (
                <div key={m.userId} className={`mp ${m.paid ? 'paid' : ''}`} onClick={() => setPicked(m)}>
                  <Avatar name={m.fullName} color={m.color} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">{m.fullName}</div>
                    <div className="am">
                      {t.payment.servingsAmount(m.servings, vnd(m.total))}
                      {(m.drinksTotal ?? 0) > 0 && ' · 🥤'}
                    </div>
                  </div>
                  <span style={{ fontSize: 18 }}>{m.paid ? '✅' : '›'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardBody>

      {picked && (
        <MemberPayModal
          member={picked}
          unitPrice={grid.week.unitPrice}
          weekId={grid.week.id}
          payment={payment}
          isAdmin={isAdmin}
          onClose={() => setPicked(null)}
          onPaid={async () => {
            setPicked(null);
            await reloadGrid();
          }}
        />
      )}
      {edit.open && (
        <PaymentEditModal
          payment={payment}
          onClose={edit.onClose}
          onSaved={async () => {
            edit.onClose();
            await reloadPayment();
          }}
        />
      )}
    </Card>
  );
}
