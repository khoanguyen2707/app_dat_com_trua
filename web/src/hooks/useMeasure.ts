import { useEffect, useRef, useState } from 'react';

/**
 * Bề rộng thực tế (px) của một phần tử, cập nhật khi khung đổi kích thước.
 *
 * Biểu đồ cần con số này: để SVG tự co theo `viewBox` thì nét vẽ và cỡ chữ phóng
 * to theo bề rộng màn hình, chart trên màn rộng thành ra cao lêu nghêu.
 */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
