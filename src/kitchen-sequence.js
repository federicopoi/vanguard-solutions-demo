import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function setupKitchenSequence() {
  const hero = document.querySelector('.hero');
  const shell = document.querySelector('.kitchen-scroll-shell');
  const canvas = hero.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return () => {};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const title = hero.querySelector('h1');
  const bottom = hero.querySelector('.hero-bottom');
  const cache = new Map();
  const pending = new Set();
  // Keep small compressed files for fast reverse scrubbing, while bounding
  // decoded image memory to the nearby viewport window.
  const files = new Map();
  const decoding = new Set();
  const failed = new Set();
  let controller = new AbortController();
  let metadata, target = 0, drawn = -1, frameRequest, trigger, disposed = false;
  let queue = [], desired = [], generation = 0, direction = 1;
  let mobile = innerWidth <= 760;
  const LIMIT = 16, CONCURRENT = 6;
  const path = index => `/kitchen-sequence/${mobile ? 'mobile/' : ''}frame-${String(index + 1).padStart(4, '0')}.webp`;
  const ready = img => img?.complete && img.naturalWidth > 0;

  function render() {
    frameRequest = null;
    if (disposed) return;
    const nearest = [...cache.keys()].filter(i => ready(cache.get(i))).sort((a,b) => Math.abs(a-target)-Math.abs(b-target))[0];
    canvas.dataset.targetFrame = String(target);
    if (nearest === undefined || nearest === drawn) return; // Keep the last painted canvas or the poster.
    const img = cache.get(nearest);
    const width = hero.clientWidth, height = hero.clientHeight;
    const ratio = Math.max(width/img.naturalWidth, height/img.naturalHeight);
    const w = img.naturalWidth*ratio, h = img.naturalHeight*ratio;
    ctx.drawImage(img, (width-w)/2, (height-h)/2, w, h);
    canvas.classList.add('is-ready');
    drawn = nearest;
    canvas.dataset.frame = String(nearest);
    canvas.dataset.targetFrame = String(target);
  }
  function schedule() { if (!frameRequest) frameRequest = requestAnimationFrame(render); }
  function trim() {
    while (cache.size > LIMIT) {
      const farthest = [...cache.keys()].filter(i => i !== drawn && i !== target).sort((a,b) => Math.abs(b-target)-Math.abs(a-target))[0];
      if (farthest === undefined) break;
      cache.delete(farthest);
    }
    canvas.dataset.cachedFrames = String(cache.size);
  }
  function decodeNearby() {
    if (disposed) return;
    const fallback = [...files.keys()].sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    for (const index of [...new Set([...desired, fallback])]) {
      if (decoding.size >= 2) break;
      if (!files.has(index) || cache.has(index) || decoding.has(index)) continue;
      const token = generation;
      const img = new Image();
      const url = URL.createObjectURL(files.get(index));
      decoding.add(index);
      img.decoding = 'async';
      img.src = url;
      img.decode().then(() => {
        if (disposed || token !== generation) return;
        cache.set(index, img); trim(); schedule();
      }).catch(() => {
        if (token === generation) { files.delete(index); failed.add(index); }
      }).finally(() => {
        URL.revokeObjectURL(url);
        if (disposed || token !== generation) return;
        decoding.delete(index); decodeNearby();
      });
    }
  }
  function pump() {
    while (!disposed && pending.size < CONCURRENT && queue.length) {
      const index = queue.shift();
      if (files.has(index) || pending.has(index) || failed.has(index)) continue;
      const token = generation;
      pending.add(index);
      fetch(path(index), { signal: controller.signal, priority: index === target ? 'high' : 'low' })
        .then(response => {
          if (!response.ok) throw new Error('Frame unavailable');
          return response.blob();
        }).then(blob => {
          if (disposed || token !== generation) return;
          files.set(index, blob); decodeNearby();
        }).catch(error => {
          if (token === generation && error.name !== 'AbortError') failed.add(index);
        }).finally(() => {
          if (disposed || token !== generation) return;
          pending.delete(index); pump();
        });
    }
  }
  function requestFrames() {
    if (!metadata) return;
    desired = [target];
    if (!motion.matches) {
      // Favor travel direction rather than spending half the window behind us.
      for (let offset = 1; offset <= 11; offset++) desired.push(target + offset * direction);
      for (let offset = 1; offset <= 4; offset++) desired.push(target - offset * direction);
    }
    desired = desired.filter(i => i >= 0 && i < metadata.frameCount);
    const downloads = [...desired];
    if (!motion.matches) {
      downloads.push(metadata.frameCount - 1);
      // Progressively warm the entire compressed sequence without decoding it.
      // Reverse scroll can reuse these files without requesting them again.
      for (let i = 0; i < metadata.frameCount; i++) downloads.push(i);
    }
    queue = [...new Set(downloads)].filter(i => !files.has(i) && !pending.has(i) && !failed.has(i));
    decodeNearby(); pump();
  }
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(hero.clientWidth*dpr);
    canvas.height = Math.round(hero.clientHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    drawn = -1; render();
  }
  function update(progress) {
    const next = Math.round(progress*(metadata.frameCount-1));
    if (next !== target) direction = next > target ? 1 : -1;
    target = next;
    const fade = Math.min(1, Math.max(0,(progress-.15)/.15));
    gsap.set([title,bottom], { opacity: 1-fade, y: -28*fade });
    // Hidden links must not remain available behind the cinematic stage.
    bottom.inert = fade === 1;
    requestFrames(); schedule();
  }
  function configure() {
    trigger?.kill();
    shell.classList.toggle('sequence-active', !motion.matches);
    bottom.inert = false;
    gsap.set([title,bottom], { clearProps: 'opacity,transform' });
    target = 0;
    if (!motion.matches && metadata) {
      trigger = ScrollTrigger.create({ trigger: shell, start: () => `top ${document.querySelector('.header').offsetHeight}px`, end: 'bottom bottom',
        onUpdate: self => update(self.progress), onRefresh: self => update(self.progress) });
      update(trigger.progress);
    } else requestFrames();
    size();
    ScrollTrigger.refresh();
  }
  const resize = () => {
    const nextMobile = innerWidth <= 760;
    if (nextMobile !== mobile) {
      mobile = nextMobile; generation++; controller.abort(); controller = new AbortController();
      pending.clear(); decoding.clear(); files.clear(); failed.clear(); cache.clear(); drawn = -1; canvas.classList.remove("is-ready"); requestFrames();
    }
    size();
  };
  window.addEventListener('resize', resize);
  motion.addEventListener('change', configure);
  fetch('/kitchen-sequence/metadata.json').then(r => { if (!r.ok) throw new Error('Sequence metadata unavailable'); return r.json(); }).then(data => {
    if (disposed) return;
    metadata = data; canvas.dataset.frameCount = String(data.frameCount); configure();
    // Adding the sticky stage changes downstream offsets after the browser's
    // initial hash navigation. Honor that same anchor once the stage exists.
    const anchor = location.hash && document.getElementById(location.hash.slice(1));
    if (anchor && anchor !== hero) {
      window.scrollTo({ top: anchor.getBoundingClientRect().top + scrollY - document.querySelector('.header').offsetHeight - 16, behavior: 'instant' });
      ScrollTrigger.update();
    }
  }).catch(() => { /* The first-frame poster keeps the original hero usable. */ });
  size();
  return () => {
    disposed = true; generation++; controller.abort(); trigger?.kill(); cancelAnimationFrame(frameRequest);
    window.removeEventListener('resize',resize); motion.removeEventListener('change',configure);
    shell.classList.remove('sequence-active'); cache.clear(); files.clear(); pending.clear(); decoding.clear(); bottom.inert=false;
    gsap.set([title,bottom],{clearProps:'opacity,transform'});
  };
}
