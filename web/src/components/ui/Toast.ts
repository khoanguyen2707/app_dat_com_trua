/** Toast đơn giản, gắn trực tiếp vào DOM (không cần provider) */
export function toast(msg: string, icon = '✅') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${icon}</span>`;
  el.appendChild(document.createTextNode(msg));
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    setTimeout(() => el.remove(), 320);
  }, 2100);
}
