import { useState } from 'react';
import { api } from '@/services/api';
import type { Dish, DishCategory } from '@/types';
import { DISH_EMOJIS, DEFAULT_DISH_PRICE } from '@/constants/config';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { Button, Field, Modal, toast } from '@/components/ui';

export function DishModal({ dish, onClose, onSaved }: { dish: Dish | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(dish?.name ?? '');
  const [desc, setDesc] = useState(dish?.description ?? '');
  const [emoji, setEmoji] = useState(dish?.emoji ?? DISH_EMOJIS[0]);
  const [price, setPrice] = useState(dish?.price ?? DEFAULT_DISH_PRICE);
  const [category, setCategory] = useState<DishCategory>(dish?.category ?? 'MAIN');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast(t.menu.nameRequired, '✏️');
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: desc.trim(), emoji, price: Number(price), category };
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
      <Field label={t.menu.fieldCategory}>
        <div className="flex gap-0.5 rounded-ui-md border border-line bg-subtle p-0.5">
          {(['MAIN', 'DRINK'] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                'flex-1 rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors',
                category === c ? 'bg-surface text-ink' : 'text-ink-3 hover:text-ink',
              )}
              onClick={() => setCategory(c)}
            >
              {c === 'MAIN' ? t.menu.catMain : t.menu.catDrink}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t.menu.fieldEmoji}>
        <div className="flex flex-wrap gap-1">
          {DISH_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={cn(
                'grid size-9 place-items-center rounded-ui border text-lg transition-colors',
                emoji === e ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong',
              )}
              onClick={() => setEmoji(e)}
            >
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
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>{t.actions.cancel}</Button>
        <Button variant="primary" onClick={save} loading={busy}>
          {dish ? t.actions.save : t.actions.add}
        </Button>
      </div>
    </Modal>
  );
}
