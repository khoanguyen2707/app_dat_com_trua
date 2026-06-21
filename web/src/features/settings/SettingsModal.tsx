import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { PaymentConfig, User, Week } from '@/types';
import { t } from '@/constants/strings';
import { cls } from '@/lib/format';
import { Avatar, Button, Field, IconButton, Modal, toast } from '@/components/ui';

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
      toast(t.settings.savedWeek, '⚙️');
      await onSaved();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async (u: User) => {
    const role = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    await api.updateUser(u.id, { role });
    setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, role } : x)));
    toast(t.settings.roleChanged(u.fullName, role), '🛡️');
  };
  const toggleActive = async (u: User) => {
    const active = !u.active;
    await api.updateUser(u.id, { active });
    setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, active } : x)));
  };
  const remove = async (u: User) => {
    if (!confirm(t.settings.confirmRemove(u.fullName))) return;
    await api.deleteUser(u.id);
    setUsers((us) => us.filter((x) => x.id !== u.id));
    await onSaved();
    toast(t.settings.removed, '🗑️');
  };

  return (
    <Modal open title={t.settings.title} onClose={onClose}>
      <h4 style={{ marginBottom: 10 }}>{t.settings.currentWeek}</h4>
      <Field label={t.settings.fieldLabel}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <Field label={t.settings.fieldUnitPrice}>
        <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
      </Field>
      <Button variant="primary" block onClick={saveWeek} loading={busy}>
        {t.settings.saveWeek}
      </Button>

      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '20px 0' }} />
      <h4 style={{ marginBottom: 6 }}>{t.settings.members(users.length)}</h4>
      <div className="ulist">
        {users.map((u) => (
          <div className="urow" key={u.id}>
            <Avatar name={u.fullName} color={u.color} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {u.fullName} {!u.active && <span className="muted small">{t.settings.locked}</span>}
              </div>
              <div className="muted small">{u.email}</div>
            </div>
            <button className={cls('pill', u.role === 'ADMIN' ? 'admin' : 'user')} onClick={() => toggleRole(u)} title={t.settings.changeRole}>
              {u.role}
            </button>
            <IconButton title={u.active ? t.settings.lock : t.settings.unlock} onClick={() => toggleActive(u)}>
              {u.active ? '🔒' : '🔓'}
            </IconButton>
            {u.id !== me?.id && (
              <IconButton title={t.actions.delete} onClick={() => remove(u)}>
                🗑️
              </IconButton>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
