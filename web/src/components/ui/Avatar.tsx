import { DEFAULT_AVATAR_COLOR } from '@/constants/config';
import { initials } from '@/lib/format';

/** Avatar hiển thị chữ cái đầu của tên, màu nền theo người dùng */
export function Avatar({ name, color, size = 32 }: { name: string; color?: string | null; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      title={name}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: color || DEFAULT_AVATAR_COLOR,
      }}
    >
      {initials(name)}
    </span>
  );
}
