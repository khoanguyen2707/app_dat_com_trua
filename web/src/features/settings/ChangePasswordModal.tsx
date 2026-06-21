import { useState } from 'react';
import { api } from '@/services/api';
import { MIN_PASSWORD_LENGTH } from '@/constants/config';
import { t } from '@/constants/strings';
import { Button, Field, Modal, toast } from '@/components/ui';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) return toast(t.password.tooShort(MIN_PASSWORD_LENGTH), '⚠️');
    setBusy(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      toast(t.password.changed, '🔑');
      onClose();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={t.password.title} onClose={onClose}>
      <Field label={t.password.current}>
        <input type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} />
      </Field>
      <Field label={t.password.new}>
        <input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} minLength={MIN_PASSWORD_LENGTH} />
      </Field>
      <div className="modal-actions">
        <Button onClick={onClose}>{t.actions.cancel}</Button>
        <Button variant="primary" onClick={save} disabled={busy}>
          {t.password.submit}
        </Button>
      </div>
    </Modal>
  );
}
