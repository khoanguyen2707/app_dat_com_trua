import { useState } from 'react';
import { api } from '../api';
import type { Dish } from '../types';
import { vnd } from '../util';
import { Modal, toast } from '../ui';

const EMO = ['🍗', '🍖', '🥩', '🐟', '🥗', '🍛', '🍜', '🍲', '🥘', '🍱', '🍳', '🦐', '🍚', '🥬', '🌶️'];

export function MenuPanel({ dishes, isAdmin, reload }: { dishes: Dish[]; isAdmin: boolean; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<Dish | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="card">
      <div className="card-h">
        <div className="ic">📋</div>
        <h2>Thực đơn</h2>
        <div className="spacer" />
        {isAdmin && (
          <button className="btn tiny primary" onClick={() => setCreating(true)}>
            ＋ Thêm món
          </button>
        )}
      </div>
      <div className="card-b">
        {dishes.length === 0 ? (
          <div className="empty">
            <div className="e">🍽️</div>
            Chưa có món nào.{isAdmin && ' Bấm ＋ Thêm món.'}
          </div>
        ) : (
          <div className="dishes">
            {dishes.map((d) => (
              <div className="dish-card" key={d.id}>
                <div className="dish-emoji">{d.emoji || '🍽️'}</div>
                <h3>{d.name}</h3>
                <div className="desc">{d.description}</div>
                <div className="price">{vnd(d.price)}</div>
                {isAdmin && (
                  <div className="dish-actions">
                    <button className="btn tiny" onClick={() => setEditing(d)}>
                      ✏️ Sửa
                    </button>
                    <button
                      className="btn tiny danger"
                      onClick={async () => {
                        if (confirm(`Xoá món "${d.name}"?`)) {
                          await api.deleteDish(d.id);
                          await reload();
                          toast('Đã xoá món', '🗑️');
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <DishModal
          dish={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function DishModal({ dish, onClose, onSaved }: { dish: Dish | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(dish?.name ?? '');
  const [desc, setDesc] = useState(dish?.description ?? '');
  const [emoji, setEmoji] = useState(dish?.emoji ?? '🍗');
  const [price, setPrice] = useState(dish?.price ?? 25000);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast('Nhập tên món', '✏️');
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: desc.trim(), emoji, price: Number(price) };
      if (dish) await api.updateDish(dish.id, payload);
      else await api.createDish(payload);
      toast(dish ? 'Đã lưu món' : 'Đã thêm món', '🍽️');
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Lỗi', '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={dish ? 'Sửa món' : 'Thêm món'} onClose={onClose}>
      <div className="field">
        <label>Biểu tượng</label>
        <div className="emoji-pick">
          {EMO.map((e) => (
            <button key={e} className={emoji === e ? 'sel' : ''} onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Tên món</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Cơm gà" />
      </div>
      <div className="field">
        <label>Mô tả</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ngắn gọn" />
      </div>
      <div className="field">
        <label>Giá (đ)</label>
        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn primary" onClick={save} disabled={busy}>
          {dish ? 'Lưu' : 'Thêm'}
        </button>
      </div>
    </Modal>
  );
}
