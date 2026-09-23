/** Toast đơn giản, gắn trực tiếp vào DOM (không cần provider) */
export function toast(msg: string, icon = '✅') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className =
      'toast-wrap pointer-events-none fixed bottom-20 left-1/2 z-80 flex -translate-x-1/2 flex-col items-center gap-2';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className =
    'inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full bg-ink px-4 py-2 ' +
    'text-[13px] font-medium text-white shadow-lg';
  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  el.append(iconEl, document.createTextNode(msg));
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    setTimeout(() => el.remove(), 320);
  }, 2100);
}
