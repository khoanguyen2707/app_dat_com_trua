import { DEFAULT_AVATAR_COLOR } from '@/constants/config';
import { initials } from '@/lib/format';

/** Avatar tròn hiển thị chữ cái đầu của tên, màu nền theo người dùng */
export function Avatar({
  name,
  color,
  size = 36,
}: {
  name: string;
  color?: string | null;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      title={name}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: color || DEFAULT_AVATAR_COLOR }}
    >
      {initials(name)}
    </span>
  );
}
