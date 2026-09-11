import { useState } from 'react';
import { api } from '@/services/api';
import type { PaymentConfig, Week } from '@/types';
import { t } from '@/constants/strings';
import { Button, Field, Modal, toast } from '@/components/ui';
import { MemberManager } from './MemberManager';

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
  const [label, setLabel] = useState(week.label);
  const [unitPrice, setUnitPrice] = useState(week.unitPrice);
  const [busy, setBusy] = useState(false);

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
      <MemberManager onChanged={onSaved} />
    </Modal>
  );
}
