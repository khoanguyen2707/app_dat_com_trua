import { useState } from 'react';
import { api } from '@/services/api';
import type { PaymentConfig } from '@/types';
import { BANKS } from '@/constants/config';
import { t } from '@/constants/strings';
import { Button, Field, Modal, toast } from '@/components/ui';

export function PaymentEditModal({
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
      toast(t.payment.updated, '💳');
      onSaved();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={t.payment.editTitle} onClose={onClose}>
      <Field label={t.payment.groupName}>
        <input value={group} onChange={(e) => setGroup(e.target.value)} />
      </Field>
      <Field label={t.payment.bank}>
        <select value={bin} onChange={(e) => setBin(e.target.value)}>
          {BANKS.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.payment.accountNumber}>
        <input value={account} onChange={(e) => setAccount(e.target.value)} />
      </Field>
      <Field label={t.payment.accountHolderNoAccent}>
        <input value={holder} onChange={(e) => setHolder(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <Button onClick={onClose}>{t.actions.cancel}</Button>
        <Button variant="primary" onClick={save} disabled={busy}>
          {t.actions.save}
        </Button>
      </div>
    </Modal>
  );
}
