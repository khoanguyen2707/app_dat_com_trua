import { useRef, useState } from 'react';
import type { Week } from '@/types';
import { t } from '@/constants/strings';
import { Modal, Tabs } from '@/components/ui';
import { WeekSettings } from './WeekSettings';
import { MemberManager } from './MemberManager';

type SettingsTab = 'week' | 'members';

const TABS = [
  { key: 'week', label: t.settings.tabWeek },
  { key: 'members', label: t.settings.tabMembers },
] as const satisfies readonly { key: SettingsTab; label: string }[];

export function SettingsModal({
  week,
  onClose,
  onSaved,
}: {
  week: Week;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [tab, setTab] = useState<SettingsTab>('week');

  /**
   * Có thay đổi thành viên nào chưa đồng bộ xuống màn hình nền chưa.
   *
   * Trước đây mỗi lần gạt một công tắc là tải lại cả grid + thanh toán + danh sách tuần
   * (3 request × mỗi lần gạt) trong khi màn hình nền đang bị modal che kín — tốn công vô
   * ích, rất ì trên API free hay ngủ. Giờ chỉ bật cờ rồi tải lại đúng MỘT lần lúc đóng.
   */
  const dirty = useRef(false);

  const close = () => {
    onClose();
    if (dirty.current) void onSaved();
  };

  return (
    <Modal
      open
      /* Tab Tuần chỉ là một form ngắn: ép khổ rộng như tab Thành viên thì nội dung
         dính trái, thừa nửa phải trống. Cho bề rộng chạy theo tab đang mở. */
      wide={tab === 'members'}
      title={t.settings.title}
      onClose={close}
      subheader={<Tabs inModal items={TABS} active={tab} onChange={setTab} />}
    >
      {tab === 'week' ? (
        <WeekSettings week={week} onSaved={onSaved} />
      ) : (
        <MemberManager
          onChanged={() => {
            dirty.current = true;
          }}
        />
      )}
    </Modal>
  );
}
