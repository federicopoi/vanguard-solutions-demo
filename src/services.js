import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Grow each photo inside a reserved slot, keeping page geometry predictable.
export function setupServiceRows() {
  const section = document.querySelector('#services');
  const rows = [...section.querySelectorAll('.service-row')];
  const preferences = gsap.matchMedia();
  preferences.add({
    motion: '(prefers-reduced-motion: no-preference)',
    mobile: '(max-width: 760px)',
    all: '(min-width: 0px)',
  }, context => {
    if (!context.conditions.motion) return;
    const mobile = context.conditions.mobile;
    const triggers = rows.map(row => {
      const frame = row.querySelector('.service-image-frame');
      const render = progress => {
        const width = (mobile ? 52 : 30) + (mobile ? 48 : 70) * progress;
        const height = (mobile ? 52 : 35) + (mobile ? 48 : 65) * progress;
        gsap.set(frame, { width: `${width}%`, height: `${height}%` });
      };
      const trigger = ScrollTrigger.create({
        trigger: mobile ? row.querySelector('.service-media') : row,
        start: mobile ? 'top 92%' : 'top 85%',
        end: mobile ? 'top 40%' : 'top 25%',
        onUpdate: self => render(self.progress),
        onRefresh: self => render(self.progress),
      });
      render(trigger.progress);
      return trigger;
    });
    return () => triggers.forEach(trigger => trigger.kill());
  });
  return () => preferences.revert();
}
