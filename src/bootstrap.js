// Let the first-screen photograph paint before downloading animation libraries.
// Early interaction starts the controls immediately, even on a slow connection.
const contact = document.querySelector('.contact-panel');
const contactObserver = new IntersectionObserver(entries => {
  if (!entries.some(entry => entry.isIntersecting)) return;
  const image = innerWidth <= 760 ? 'contact-room-960.webp' : 'contact-room.webp';
  contact.style.setProperty('--contact-image', `url('/media/vanguard/${image}')`);
  contactObserver.disconnect();
}, { rootMargin: '900px' });
contactObserver.observe(contact);
if (import.meta.hot) import.meta.hot.dispose(() => contactObserver.disconnect());

let runtime;
let ready = false;
const loadRuntime = () => {
  if (runtime) return runtime;
  const section = document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('section');
  const top = section && section.getBoundingClientRect().top + scrollY;
  const hash = location.hash;
  runtime = import('./main.js').then(() => {
    if (section && section.id !== 'home' && section.id !== 'projects') {
      const delta = section.getBoundingClientRect().top + scrollY - top;
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
    }
    if (location.hash && location.hash !== hash) {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView({ behavior: 'instant' });
    }
    ready = true;
  });
  return runtime;
};
const queueClick = event => {
  const control = event.target.closest('.menu-toggle, [data-project], [data-video]');
  if (ready || !control) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  loadRuntime().then(() => control.isConnected && control.click());
};
window.addEventListener('click', queueClick, true);
const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const interact = () => {
  loadRuntime();
  for (const event of events) window.removeEventListener(event, interact);
};
for (const event of events) window.addEventListener(event, interact, { passive: true, once: true });
const hero = document.querySelector('.hero-image');
try { await hero.decode(); } catch { /* Keep the page usable if the image fails. */ }
await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
await loadRuntime();
window.removeEventListener('click', queueClick, true);
for (const event of events) window.removeEventListener(event, interact);
