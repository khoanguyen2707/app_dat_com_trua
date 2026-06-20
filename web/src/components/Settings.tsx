import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import type { PaymentConfig, User, Week } from '../types';
import { initials } from '../util';
import { Modal, toast } from '../ui';

export function SettingsModal({
  week,
  onClose,
  onSaved,
}: {
  week: Week;
  payment: PaymentConfig | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { user: me } = useAuth();
  const [label, setLabel] = useState(week.label);
  const [unitPrice, setUnitPrice] = useState(week.unitPrice);
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.users().then(setUsers).catch(() => {});
  }, []);

  const saveWeek = async () => {
    setBusy(true);
    try {
      await api.updateWeek(week.id, { label: label.trim(), unitPrice: Number(unitPrice) });
      toast('Đã lưu tuần', '⚙️');
      await onSaved();
    } catch (e: any) {
      toast(e.message || 'Lỗi', '⚠️');
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async (u: User) => {
    const role = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    await api.updateUser(u.id, { role });
    setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, role } : x)));
    toast(`${u.fullName} → ${role}`, '🛡️');
  };
  const toggleActive = async (u: User) => {
    const active = !u.active;
    await api.updateUser(u.id, { active });
    setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, active } : x)));
  };
  const remove = async (u: User) => {
    if (!confirm(`Xoá thành viên "${u.fullName}"?`)) return;
    await api.deleteUser(u.id);
    setUsers((us) => us.filter((x) => x.id !== u.id));
    await onSaved();
    toast('Đã xoá', '🗑️');
  };

  return (
    <Modal open title="⚙️ Cài đặt (Admin)" onClose={onClose}>
      <h4 style={{ marginBottom: 10 }}>Tuần hiện hành</h4>
      <div className="field">
        <label>Nhãn tuần</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="field">
        <label>Đơn giá / suất (đ)</label>
        <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
      </div>
      <button className="btn primary block" onClick={saveWeek} disabled={busy}>
        Lưu tuần
      </button>

      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '20px 0' }} />
      <h4 style={{ marginBottom: 6 }}>Thành viên ({users.length})</h4>
      <div className="ulist">
        {users.map((u) => (
          <div className="urow" key={u.id}>
            <span className="avatar" style={{ width: 32, height: 32, fontSize: 13, background: u.color || '#0a84ff' }}>
              {initials(u.fullName)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {u.fullName} {!u.active && <span className="muted small">(khoá)</span>}
              </div>
              <div className="muted small">{u.email}</div>
            </div>
            <button className={`pill ${u.role === 'ADMIN' ? 'admin' : 'user'}`} onClick={() => toggleRole(u)} title="Đổi quyền">
              {u.role}
            </button>
            <button className="btn-ico" title={u.active ? 'Khoá' : 'Mở khoá'} onClick={() => toggleActive(u)}>
              {u.active ? '🔒' : '🔓'}
            </button>
            {u.id !== me?.id && (
              <button className="btn-ico" title="Xoá" onClick={() => remove(u)}>
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (newPassword.length < 6) return toast('Mật khẩu mới tối thiểu 6 ký tự', '⚠️');
    setBusy(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      toast('Đổi mật khẩu thành công', '🔑');
      onClose();
    } catch (e: any) {
      toast(e.message || 'Lỗi', '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="🔑 Đổi mật khẩu" onClose={onClose}>
      <div className="field">
        <label>Mật khẩu hiện tại</label>
        <input type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} />
      </div>
      <div className="field">
        <label>Mật khẩu mới</label>
        <input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} minLength={6} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn primary" onClick={save} disabled={busy}>
          Đổi mật khẩu
        </button>
      </div>
    </Modal>
  );
}
