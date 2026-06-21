import { useState } from 'react';
import { api } from '@/services/api';
import type { Dish } from '@/types';
import { DISH_EMOJIS, DEFAULT_DISH_PRICE } from '@/constants/config';
import { t } from '@/constants/strings';
import { cls } from '@/lib/format';
import { Button, Field, Modal, toast } from '@/components/ui';

export function DishModal({ dish, onClose, onSaved }: { dish: Dish | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(dish?.name ?? '');
  const [desc, setDesc] = useState(dish?.description ?? '');
  const [emoji, setEmoji] = useState(dish?.emoji ?? DISH_EMOJIS[0]);
  const [price, setPrice] = useState(dish?.price ?? DEFAULT_DISH_PRICE);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast(t.menu.nameRequired, '✏️');
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: desc.trim(), emoji, price: Number(price) };
      if (dish) await api.updateDish(dish.id, payload);
      else await api.createDish(payload);
      toast(dish ? t.menu.saved : t.menu.added, '🍽️');
      onSaved();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={dish ? t.menu.modalEdit : t.menu.modalCreate} onClose={onClose}>
      <Field label={t.menu.fieldEmoji}>
        <div className="emoji-pick">
          {DISH_EMOJIS.map((e) => (
            <button key={e} className={cls(emoji === e && 'sel')} onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t.menu.fieldName}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.menu.namePlaceholder} />
      </Field>
      <Field label={t.menu.fieldDesc}>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t.menu.descPlaceholder} />
      </Field>
      <Field label={t.menu.fieldPrice}>
        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </Field>
      <div className="modal-actions">
        <Button onClick={onClose}>{t.actions.cancel}</Button>
        <Button variant="primary" onClick={save} disabled={busy}>
          {dish ? t.actions.save : t.actions.add}
        </Button>
      </div>
    </Modal>
  );
}
