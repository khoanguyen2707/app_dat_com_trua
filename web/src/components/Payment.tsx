import { useState } from 'react';
import { api } from '../api';
import type { Grid, GridMember, PaymentConfig } from '../types';
import { BANKS, initials, vietqr, vnd } from '../util';
import { Modal, toast } from '../ui';

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
  const [editing, setEditing] = useState(false);
  const eating = grid.members.filter((m) => m.servings > 0);

  const copy = () => {
    navigator.clipboard?.writeText(payment.accountNumber);
    toast('Đã copy số tài khoản', '📋');
  };

  return (
    <div className="card">
      <div className="card-h">
        <div className="ic">💳</div>
        <h2>Thanh toán</h2>
        <div className="spacer" />
        {isAdmin && (
          <button className="btn tiny" onClick={() => setEditing(true)}>
            ✏️ Sửa
          </button>
        )}
      </div>
      <div className="card-b">
        <div className="pay-grid">
          <div className="qr-box">
            <img src={vietqr(payment, undefined, `Com trua ${grid.week.label}`)} alt="QR" />
            <div style={{ marginTop: 13, fontWeight: 800, fontSize: 15 }}>{payment.accountHolder}</div>
            <div className="small muted">
              {payment.bankName} • {payment.accountNumber}
            </div>
          </div>
          <div>
            <div className="acct-row">
              <div>
                <div className="k">Chủ tài khoản</div>
                <div className="v">{payment.accountHolder}</div>
              </div>
            </div>
            <div className="acct-row">
              <div>
                <div className="k">Ngân hàng</div>
                <div className="v">{payment.bankName}</div>
              </div>
            </div>
            <div className="acct-row">
              <div>
                <div className="k">Số tài khoản</div>
                <div className="v">{payment.accountNumber}</div>
              </div>
              <button className="btn tiny primary" onClick={copy}>
                📋 Copy
              </button>
            </div>
            <div className="hint" style={{ marginTop: 14 }}>
              🔎 Chạm tên để mở QR <b>đã điền sẵn số tiền</b> của từng người.
            </div>
            <div className="member-pay">
              {eating.length === 0 && <div className="small muted">Chưa có ai đăng ký ăn.</div>}
              {eating.map((m) => (
                <div key={m.userId} className={`mp ${m.paid ? 'paid' : ''}`} onClick={() => setPicked(m)}>
                  <span className="avatar" style={{ background: m.color || '#0a84ff' }}>
                    {initials(m.fullName)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">{m.fullName}</div>
                    <div className="am">
                      {m.servings} suất • {vnd(m.servings * grid.week.unitPrice)}
                    </div>
                  </div>
                  <span style={{ fontSize: 18 }}>{m.paid ? '✅' : '›'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
      {editing && (
        <PaymentEditModal
          payment={payment}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await reloadPayment();
          }}
        />
      )}
    </div>
  );
}

function MemberPayModal({
  member,
  unitPrice,
  weekId,
  payment,
  isAdmin,
  onClose,
  onPaid,
}: {
  member: GridMember;
  unitPrice: number;
  weekId: string;
  payment: PaymentConfig;
  isAdmin: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const amount = member.servings * unitPrice;
  const info = `Com trua ${member.fullName}`;
  return (
    <Modal open title={`Thanh toán · ${member.fullName}`} onClose={onClose}>
      <div className="center">
        <img
          src={vietqr(payment, amount, info)}
          alt="QR"
          style={{ width: 240, maxWidth: '100%', borderRadius: 16, boxShadow: 'var(--shadow)' }}
        />
        <div className="small muted" style={{ marginTop: 10 }}>
          Số tiền cần chuyển
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand)' }}>{vnd(amount)}</div>
        <div className="small muted">
          {member.servings} suất × {vnd(unitPrice)}
        </div>
        <div className="acct-row" style={{ marginTop: 16, textAlign: 'left' }}>
          <div>
            <div className="k">Nội dung CK</div>
            <div className="v" style={{ fontSize: 14 }}>
              {info}
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="modal-actions">
            <button
              className={`btn ${member.paid ? '' : 'success'}`}
              onClick={async () => {
                await api.setPaid(weekId, member.userId, !member.paid);
                toast(member.paid ? 'Đã bỏ đánh dấu' : 'Đã đánh dấu thanh toán', member.paid ? '↩️' : '✅');
                onPaid();
              }}
            >
              {member.paid ? '↩️ Bỏ đánh dấu' : '✅ Đã thanh toán'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PaymentEditModal({
  payment,
  onClose,
  onSaved,
}: {
  payment: PaymentConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bin, setBin] = useState(payment.bankBin);
  const [account, setAccount] = useState(payment.accountNumber);
  const [holder, setHolder] = useState(payment.accountHolder);
  const [group, setGroup] = useState(payment.groupName);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const bank = BANKS.find((b) => b.bin === bin);
      await api.updatePayment({
        bankBin: bin,
        bankName: bank?.name ?? payment.bankName,
        accountNumber: account.trim(),
        accountHolder: holder.trim(),
        groupName: group.trim(),
      });
      toast('Đã cập nhật thanh toán', '💳');
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Lỗi', '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Thông tin thanh toán" onClose={onClose}>
      <div className="field">
        <label>Tên nhóm</label>
        <input value={group} onChange={(e) => setGroup(e.target.value)} />
      </div>
      <div className="field">
        <label>Ngân hàng</label>
        <select value={bin} onChange={(e) => setBin(e.target.value)}>
          {BANKS.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Số tài khoản</label>
        <input value={account} onChange={(e) => setAccount(e.target.value)} />
      </div>
      <div className="field">
        <label>Chủ tài khoản (không dấu)</label>
        <input value={holder} onChange={(e) => setHolder(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn primary" onClick={save} disabled={busy}>
          Lưu
        </button>
      </div>
    </Modal>
  );
}
