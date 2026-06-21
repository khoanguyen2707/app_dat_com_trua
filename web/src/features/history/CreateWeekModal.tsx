import { useState } from 'react';
import { api } from '@/services/api';
import { DEFAULT_UNIT_PRICE } from '@/constants/config';
import { t } from '@/constants/strings';
import { Button, Field, Modal, toast } from '@/components/ui';

export function CreateWeekModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState('');
  const [unitPrice, setUnitPrice] = useState(DEFAULT_UNIT_PRICE);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!label.trim()) return toast(t.history.labelRequired, '✏️');
    setBusy(true);
    try {
      await api.createWeek(label.trim(), Number(unitPrice));
      toast(t.history.created, '🆕');
      onSaved();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={t.history.modalTitle} onClose={onClose}>
      <Field label={t.history.fieldLabel}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t.history.labelPlaceholder} />
      </Field>
      <Field label={t.history.fieldUnitPrice}>
        <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
      </Field>
      <div className="modal-actions">
        <Button onClick={onClose}>{t.actions.cancel}</Button>
        <Button variant="primary" onClick={save} disabled={busy}>
          {t.history.createBtn}
        </Button>
      </div>
    </Modal>
  );
}
