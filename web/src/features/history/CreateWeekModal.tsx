import { useRef, useState } from 'react';
import { api } from '@/services/api';
import { DEFAULT_UNIT_PRICE } from '@/constants/config';
import { t } from '@/constants/strings';
import { Button, Field, Modal, toast } from '@/components/ui';

/** "2026-06-22" -> "22/6/2026" (dùng UTC để khỏi lệch múi giờ) */
function ddmmyyyy(d: Date) {
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

/** Sinh nhãn "T2 - T7" từ ngày bắt đầu (cộng 5 ngày). */
function labelFromStart(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  const start = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const end = new Date(start.getTime() + 5 * 86_400_000);
  return `${ddmmyyyy(start)} - ${ddmmyyyy(end)}`;
}

export function CreateWeekModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [startDate, setStartDate] = useState('');
  const [label, setLabel] = useState('');
  const [unitPrice, setUnitPrice] = useState(DEFAULT_UNIT_PRICE);
  const [busy, setBusy] = useState(false);
  const autoLabel = useRef(''); // nhãn tự sinh gần nhất — để không đè nhãn admin tự gõ

  const onDate = (iso: string) => {
    setStartDate(iso);
    const next = labelFromStart(iso);
    // chỉ tự điền nếu admin chưa tự sửa nhãn
    if (!label.trim() || label === autoLabel.current) {
      setLabel(next);
      autoLabel.current = next;
    }
  };

  const save = async () => {
    if (!label.trim()) return toast(t.history.labelRequired, '✏️');
    setBusy(true);
    try {
      await api.createWeek(label.trim(), Number(unitPrice), startDate || undefined);
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
      <Field label={t.history.fieldStartDate}>
        <input type="date" value={startDate} onChange={(e) => onDate(e.target.value)} />
        <div className="small muted" style={{ marginTop: 6 }}>
          {t.history.startDateHint}
        </div>
      </Field>
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
