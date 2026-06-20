import { useState } from 'react';
import { api } from '../api';
import type { Week } from '../types';
import { vnd } from '../util';
import { Modal, toast } from '../ui';

export function HistoryPanel({
  weeks,
  isAdmin,
  reload,
}: {
  weeks: Week[];
  isAdmin: boolean;
  reload: () => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);

  const del = async (w: Week) => {
    if (!confirm(`Xoá tuần "${w.label}"? Mọi đăng ký của tuần này sẽ mất.`)) return;
    await api.deleteWeek(w.id);
    await reload();
    toast('Đã xoá tuần', '🗑️');
  };

  return (
    <div className="card">
      <div className="card-h">
        <div className="ic">🕐</div>
        <h2>Lịch sử các tuần</h2>
        <div className="spacer" />
        {isAdmin && (
          <button className="btn tiny success" onClick={() => setCreating(true)}>
            ＋ Tuần mới
          </button>
        )}
      </div>
      <div className="card-b flush">
        {weeks.length === 0 ? (
          <div className="empty">
            <div className="e">🕐</div>
            Chưa có tuần nào.
          </div>
        ) : (
          weeks.map((w) => (
            <div className="hist-item" key={w.id}>
              <div className="ic">📅</div>
              <div className="info">
                <b>{w.label}</b> {w.isActive && <span className="badge-active">Đang mở</span>}
                <div className="meta">
                  {w.servings ?? 0} suất • {vnd(w.total ?? 0)} • {w.memberCount ?? 0} người • {vnd(w.unitPrice)}/suất
                </div>
              </div>
              {isAdmin && (
                <button className="btn-ico" title="Xoá" onClick={() => del(w)}>
                  🗑️
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {isAdmin && (
        <div className="hint" style={{ margin: 16 }}>
          🆕 "Tuần mới" tạo một tuần trống và đặt làm tuần hiện hành (giữ nguyên thành viên). Tuần cũ vẫn lưu ở đây.
        </div>
      )}

      {creating && (
        <CreateWeekModal
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function CreateWeekModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState('');
  const [unitPrice, setUnitPrice] = useState(25000);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!label.trim()) return toast('Nhập nhãn tuần', '✏️');
    setBusy(true);
    try {
      await api.createWeek(label.trim(), Number(unitPrice));
      toast('Đã tạo tuần mới', '🆕');
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Lỗi', '⚠️');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Tạo tuần mới" onClose={onClose}>
      <div className="field">
        <label>Nhãn tuần</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="VD: 22/6/2026 - 27/6/2026" />
      </div>
      <div className="field">
        <label>Đơn giá / suất (đ)</label>
        <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn primary" onClick={save} disabled={busy}>
          Tạo & kích hoạt
        </button>
      </div>
    </Modal>
  );
}
