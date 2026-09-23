import { useState } from 'react';
import { api } from '@/services/api';
import type { Week } from '@/types';
import { t } from '@/constants/strings';
import { Button, Field, toast } from '@/components/ui';

/** Tab "Tuần" của Cài đặt: sửa nhãn + đơn giá của tuần đang mở. */
export function WeekSettings({ week, onSaved }: { week: Week; onSaved: () => Promise<void> }) {
  const [label, setLabel] = useState(week.label);
  const [unitPrice, setUnitPrice] = useState(week.unitPrice);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.updateWeek(week.id, { label: label.trim(), unitPrice: Number(unitPrice) });
      toast(t.settings.savedWeek, '⚙️');
      // Tải lại ngay (không hoãn tới lúc đóng modal như tab Thành viên): nhãn tuần
      // hiện trên TopBar ngay sau lưng modal nên phải đổi theo liền.
      await onSaved();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm">
      <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-4">
        {t.settings.currentWeek}
      </h4>
      <Field label={t.settings.fieldLabel}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <Field label={t.settings.fieldUnitPrice}>
        <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
      </Field>
      <Button variant="primary" block onClick={save} loading={busy}>
        {t.settings.saveWeek}
      </Button>
    </div>
  );
}
