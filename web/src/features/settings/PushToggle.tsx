import { useState } from 'react';
import { Bell, BellOff, Share, Loader2 } from 'lucide-react';
import { usePush } from '@/hooks/usePush';
import { toast } from '@/components/ui';

/**
 * Công tắc thông báo đẩy, đặt ngay trong dropdown chuông — chỗ duy nhất cả admin lẫn
 * thành viên đều có, và đúng lúc người ta đang nghĩ về thông báo.
 *
 * Mỗi trạng thái nói rõ phải làm gì tiếp: iPhone chưa cài thì chỉ cách cài, bị chặn thì
 * nói phải mở lại ở cài đặt trình duyệt. Một nút "Bật" bấm không ăn gì là cách chắc chắn
 * nhất khiến người dùng bỏ luôn tính năng.
 */
export function PushToggle() {
  const { state, busy, enable, disable } = usePush();
  const [hint, setHint] = useState(false);

  if (state === 'loading' || state === 'unsupported' || state === 'server-off') return null;

  if (state === 'ios-needs-install') {
    return (
      <div className="border-b border-line bg-subtle px-3 py-2.5 text-[12px] text-ink-2">
        <div className="flex items-center gap-1.5 font-medium text-ink">
          <Share className="size-3.5" />
          Bật thông báo trên iPhone
        </div>
        <p className="mt-1 leading-snug text-ink-3">
          Safari chỉ gửi được thông báo khi app đã ở màn hình chính. Bấm nút <b>Chia sẻ</b> ở thanh dưới → chọn{' '}
          <b>Thêm vào MH chính</b>, rồi mở app từ biểu tượng vừa tạo.
        </p>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="border-b border-line bg-subtle px-3 py-2.5 text-[12px] text-ink-3">
        <div className="flex items-center gap-1.5 font-medium text-ink">
          <BellOff className="size-3.5" />
          Thông báo đang bị chặn
        </div>
        <p className="mt-1 leading-snug">
          Bạn đã chặn thông báo cho trang này. Mở lại trong cài đặt trình duyệt (biểu tượng ổ khoá cạnh thanh địa
          chỉ) rồi quay lại đây.
        </p>
      </div>
    );
  }

  const on = state === 'on';
  const toggle = async () => {
    try {
      await (on ? disable() : enable());
      toast(on ? 'Đã tắt thông báo đẩy.' : 'Đã bật thông báo đẩy trên thiết bị này.', on ? '🔕' : '🔔');
      setHint(false);
    } catch (e: any) {
      toast(e?.message || 'Không bật được thông báo.', '⚠️');
      setHint(true);
    }
  };

  return (
    <div className="flex items-start gap-2 border-b border-line bg-subtle px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
          {on ? <Bell className="size-3.5" /> : <BellOff className="size-3.5 text-ink-4" />}
          Thông báo đẩy {on ? 'đang bật' : 'đang tắt'}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-3">
          {on
            ? 'Nhắc trước giờ chốt, thực đơn mới, xác nhận thanh toán, lượt đi lấy cơm.'
            : 'Bật để được nhắc trước giờ chốt 10:15, kể cả khi không mở app.'}
          {hint && ' Nếu trình duyệt không hỏi gì, kiểm tra quyền thông báo của trang.'}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="shrink-0 rounded-ui border border-line bg-surface px-2.5 py-1 text-[12px] font-medium transition-colors hover:border-line-strong disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : on ? 'Tắt' : 'Bật'}
      </button>
    </div>
  );
}
