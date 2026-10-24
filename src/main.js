import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './runtime-fonts.css';
import { setupServiceRows } from './services.js';
import { setupKitchenSequence } from './kitchen-sequence.js';

gsap.registerPlugin(ScrollTrigger);

// A single progress-driven title effect.
let pageScroll = null;
function setupHeroScroll() {
  const hero = document.querySelector('.hero');
  const title = document.querySelector('#hero-title');
  const preferences = gsap.matchMedia();
  preferences.add('(prefers-reduced-motion: no-preference)', () => {
    const lenis = new Lenis({
      lerp: 0.16,
      anchors: true,
      prevent: node => Boolean(node.closest('dialog, textarea, #navigation.open')),
    });
    pageScroll = lenis;
    const syncScrollSize = () => lenis.resize();
    ScrollTrigger.addEventListener('refresh', syncScrollSize);
    lenis.on('scroll', ScrollTrigger.update);
    const tick = time => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Avoid smooth scrolling fighting the native modal's scroll lock.
    const dialog = document.querySelector('#media-dialog');
    const updateModal = () => dialog.open ? lenis.stop() : lenis.start();
    const modalObserver = new MutationObserver(updateModal);
    modalObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    return () => {
      modalObserver.disconnect();
      gsap.ticker.remove(tick);
      ScrollTrigger.removeEventListener('refresh', syncScrollSize);
      lenis.destroy();
      if (pageScroll === lenis) pageScroll = null;
    };
  });
  const destroySequence = setupKitchenSequence();
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  if (import.meta.hot) import.meta.hot.dispose(() => { destroySequence(); preferences.revert(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupHeroScroll, { once: true });
else setupHeroScroll();

// Expand only the photograph's frame; its grid slot and the copy stay still.
function setupTeamPhoto() {
  const photo = document.querySelector('.team-photo');
  const frame = photo.querySelector('.team-photo-frame');
  const section = document.querySelector('#about');
  const preferences = gsap.matchMedia();
  preferences.add({ mobile: '(max-width: 760px)', reduced: '(prefers-reduced-motion: reduce)', all: '(min-width: 0px)' }, context => {
    const { mobile, reduced } = context.conditions;
    let margin = 0;
    let topMargin = 0;
    const measure = () => {
      const sectionBounds = section.getBoundingClientRect();
      margin = sectionBounds.left;
      topMargin = Math.max(0, photo.getBoundingClientRect().top - sectionBounds.top);
    };
    measure();
    const render = progress => {
      const expansion = margin * progress;
      const upward = topMargin * progress;
      gsap.set(frame, { left: -expansion, top: -upward, width: `calc(100% + ${expansion * (mobile ? 2 : 1)}px)`, height: `calc(100% + ${upward}px)` });
    };
    if (reduced) {
      const resize = () => { measure(); render(1); };
      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
    const trigger = ScrollTrigger.create({
      trigger: photo,
      start: 'top 85%',
      end: 'top 35%',
      onUpdate: self => render(self.progress),
      onRefresh: self => { measure(); render(self.progress); },
    });
    render(trigger.progress);
    return () => trigger.kill();
  });
  if (import.meta.hot) import.meta.hot.dispose(() => preferences.revert());
}
setupTeamPhoto();

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
menu.addEventListener('click', () => { const open = navigation.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
navigation.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); menu.focus(); } });

const dialog = document.querySelector('#media-dialog');
const content = document.querySelector('#dialog-content');
const projects = {
  "porch-front": {
    "image": "vanguard/gallery-porch-front",
    "title": "Porch front.",
    "description": "Front porch with gray decking, white handrails and brick facade. AI-recreated from the supplied Vanguard project photo.",
    "url": "#projects"
  },
  "porch-walk": {
    "image": "vanguard/gallery-porch-walk",
    "title": "Porch walk.",
    "description": "Gray composite decking along a brick house with green shutters. AI-recreated from the supplied Vanguard project photo.",
    "url": "#projects"
  },
  "kitchen-sink": {
    "image": "vanguard/gallery-kitchen-sink",
    "title": "Kitchen sink.",
    "description": "Gray shaker cabinets, white counters and a double stainless sink. AI-recreated from the supplied Vanguard project photo.",
    "url": "#projects"
  },
  "kitchen-entry": {
    "image": "vanguard/gallery-kitchen-entry",
    "title": "Kitchen entry.",
    "description": "Updated gray kitchen viewed through the opening beside the peninsula. AI-recreated from the supplied Vanguard project photo.",
    "url": "#projects"
  },
  "finished-room": {
    "image": "vanguard/gallery-finished-room",
    "title": "Finished room.",
    "description": "Finished room with pale walls, white trim and brown wood-look flooring. AI-recreated from the supplied Vanguard project photo.",
    "url": "#projects"
  },
  "deck-detail": {
    "image": "vanguard/gallery-deck-detail",
    "title": "Deck detail.",
    "description": "Composite deck boards and pale porch columns beside green shutters. AI-recreated from the supplied Vanguard project photo.",
    "url": "#projects"
  }
};
const galleryPhotos = [...document.querySelectorAll('#projects [data-project]')];
let galleryIndex = -1;
let mediaOpener = null;
const closePreview = dialog.querySelector('.dialog-close');
const photoControls = document.createElement('div');
photoControls.className = 'lightbox-controls';
photoControls.hidden = true;
photoControls.innerHTML = '<button type="button" aria-label="Previous photo">←</button><span class="lightbox-count" aria-live="polite"></span><button type="button" aria-label="Next photo">→</button>';
dialog.append(photoControls);
function showGalleryPhoto(index) {
  galleryIndex = (index + galleryPhotos.length) % galleryPhotos.length;
  const project = projects[galleryPhotos[galleryIndex].dataset.project];
  const media = document.createElement('img');
  media.className = 'dialog-media';
  media.src = `/media/${project.image}.webp`;
  media.alt = project.description;
  content.replaceChildren(media);
  photoControls.querySelector('.lightbox-count').textContent = `${galleryIndex + 1} / ${galleryPhotos.length}`;
}
photoControls.querySelector('[aria-label="Previous photo"]').addEventListener('click', () => showGalleryPhoto(galleryIndex - 1));
photoControls.querySelector('[aria-label="Next photo"]').addEventListener('click', () => showGalleryPhoto(galleryIndex + 1));
function openMedia(button) {
  mediaOpener = button;
  const index = galleryPhotos.indexOf(button);
  const galleryMode = index >= 0;
  dialog.classList.toggle('photo-lightbox', galleryMode);
  photoControls.hidden = !galleryMode;
  closePreview.textContent = galleryMode ? '×' : 'Close ×';
  if (galleryMode) {
    dialog.removeAttribute('aria-labelledby');
    dialog.setAttribute('aria-label', 'Vanguard project photo gallery');
    showGalleryPhoto(index);
    dialog.showModal();
    return;
  }
  galleryIndex = -1;
  dialog.removeAttribute('aria-label');
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  content.replaceChildren();
  const videoName = button.dataset.video;
  const media = document.createElement('video');
  media.className = 'dialog-media';
  media.src = `/media/${videoName}.mp4`;
  media.controls = true; media.playsInline = true; media.preload = 'metadata';
  media.setAttribute('aria-label', videoName === 'craft-film' ? 'Vanguard bathroom renovation in progress' : 'Vanguard gray kitchen transformation');
  const title = document.createElement('h2'); title.id = 'dialog-title'; title.className = 'dialog-title';
  title.textContent = videoName === 'craft-film' ? 'The work behind the walls.' : 'A kitchen, transformed.';
  content.append(media, title);
  dialog.showModal();
  media.play().catch(() => { /* Native controls remain available if autoplay is blocked. */ });
}
document.querySelectorAll('[data-project], [data-video]').forEach(button => button.addEventListener('click', () => openMedia(button)));
closePreview.addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', event => {
  if (galleryIndex < 0 || !dialog.open) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showGalleryPhoto(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
let touchStart = null;
content.addEventListener('touchstart', event => { touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }, { passive: true });
content.addEventListener('touchend', event => {
  if (galleryIndex < 0 || !touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) showGalleryPhoto(galleryIndex + (dx < 0 ? 1 : -1));
}, { passive: true });
dialog.addEventListener('click', event => { const bounds = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close(); });
dialog.addEventListener('close', () => {
  const video = dialog.querySelector('video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  galleryIndex = -1;
  mediaOpener?.focus({ preventScroll: true });
});

// Desktop page scrolling advances the pinned gallery.
// Phones and reduced motion use native horizontal scrolling instead.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const nativeGallery = matchMedia('(max-width: 760px), (max-width: 1000px) and (pointer: coarse)');
function setupGallery() {
  const track = document.querySelector('.gallery-track');
  const gallery = document.querySelector('#projects');
  let scrollScene = null;
  const preferences = gsap.matchMedia();
  const cards = [...track.children];
  const events = new AbortController();
  const options = { signal: events.signal };
  let frame = 0;
  let paintFrame = 0;
  let target = track.scrollLeft;
  let lastTime = 0;
  let drag = null;
  let suppressClick = false;
  const maximum = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const clamp = value => Math.max(0, Math.min(value, maximum()));

  function paint() {
    paintFrame = 0;
    const viewport = track.getBoundingClientRect();
    cards.forEach(card => {
      const image = card.querySelector('img');
      if (reducedMotion.matches || nativeGallery.matches) { image.style.removeProperty('transform'); return; }
      const bounds = card.getBoundingClientRect();
      const position = (bounds.left + bounds.width / 2 - viewport.left - viewport.width / 2) / ((viewport.width + bounds.width) / 2);
      const offset = Math.max(-1, Math.min(1, position)) * bounds.width * .115;
      image.style.transform = `translate3d(${offset}px, 0, 0)`;
    });
  }
  function requestPaint() { if (!paintFrame) paintFrame = requestAnimationFrame(paint); }
  function stopGlide() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; target = track.scrollLeft; }
  function glide(time) {
    const elapsed = lastTime ? Math.min(time - lastTime, 50) : 16.67;
    lastTime = time;
    const next = track.scrollLeft + (target - track.scrollLeft) * (1 - Math.pow(.86, elapsed / 16.67));
    track.scrollLeft = Math.abs(target - next) < 4 ? target : next;
    if (Math.abs(target - track.scrollLeft) > 1) frame = requestAnimationFrame(glide);
    else { frame = 0; lastTime = 0; }
    requestPaint();
  }
  function moveTo(value) {
    if (scrollScene) {
      const progress = maximum() ? clamp(value) / maximum() : 0;
      const top = scrollScene.start + progress * (scrollScene.end - scrollScene.start);
      if (pageScroll) pageScroll.scrollTo(top, { immediate: true });
      else window.scrollTo({ top, behavior: 'instant' });
      ScrollTrigger.update();
      return;
    }
    target = clamp(value);
    if (reducedMotion.matches) { stopGlide(); track.scrollLeft = clamp(value); requestPaint(); }
    else if (!frame) frame = requestAnimationFrame(glide);
  }
  track.addEventListener('wheel', event => {
    if (scrollScene || nativeGallery.matches || event.ctrlKey || dialog.open) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
    const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
    if ((delta < 0 && track.scrollLeft <= 1) || (delta > 0 && track.scrollLeft >= maximum() - 1)) { stopGlide(); return; }
    const current = frame ? target : track.scrollLeft;
    if (!delta) return;
    event.preventDefault();
    moveTo(current + delta);
  }, { ...options, passive: false });
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    const current = frame ? target : track.scrollLeft;
    const step = cards[0].offsetWidth + parseFloat(getComputedStyle(track).gap);
    const positions = { ArrowRight: current + step, ArrowLeft: current - step, Home: 0, End: maximum() };
    if (event.key in positions) { event.preventDefault(); moveTo(positions[event.key]); }
  }, options);
  track.addEventListener('pointerdown', event => {
    stopGlide();
    suppressClick = false;
    if (event.pointerType === 'mouse' && event.button === 0) drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
  }, options);
  track.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = drag.x - event.clientX;
    if (!drag.moved && Math.abs(distance) > 6) {
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    if (drag.moved) { track.scrollLeft = clamp(drag.left + distance); requestPaint(); }
  }, options);
  function endDrag() {
    if (!drag) return;
    suppressClick = drag.moved;
    const pointerId = drag.id;
    const moved = drag.moved;
    drag = null;
    if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
    if (moved && scrollScene) moveTo(track.scrollLeft);
    track.classList.remove('is-dragging');
  }
  track.addEventListener('pointerup', endDrag, options);
  track.addEventListener('pointercancel', endDrag, options);
  track.addEventListener('lostpointercapture', endDrag, options);
  track.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  }, { ...options, capture: true });
  track.addEventListener('scroll', requestPaint, { ...options, passive: true });
  track.addEventListener('dragstart', event => event.preventDefault(), options);
  function updateMotion() { stopGlide(); requestPaint(); }
  reducedMotion.addEventListener('change', updateMotion, options);
  nativeGallery.addEventListener('change', updateMotion, options);
  const resize = new ResizeObserver(() => { target = clamp(target); requestPaint(); });
  resize.observe(track);
  track.classList.add('gallery-parallax');
  preferences.add({ motion: '(prefers-reduced-motion: no-preference)', native: '(max-width: 760px), (max-width: 1000px) and (pointer: coarse)', all: '(min-width: 0px)' }, context => {
    if (!context.conditions.motion || context.conditions.native) return;
    gallery.classList.add('gallery-scroll-scene');
    stopGlide();
    const render = self => {
      track.scrollLeft = self.progress * maximum();
      paint();
    };
    scrollScene = ScrollTrigger.create({
      trigger: gallery,
      start: 'top top',
      end: () => `+=${Math.max(1, maximum())}`,
      pin: true,
      pinSpacing: true,
      invalidateOnRefresh: true,
      onUpdate: render,
      onRefresh: render,
    });
    render(scrollScene);
    pageScroll?.resize();
    return () => {
      scrollScene.kill();
      scrollScene = null;
      gallery.classList.remove('gallery-scroll-scene');
      requestAnimationFrame(() => { pageScroll?.resize(); ScrollTrigger.refresh(); });
    };
  });
  paint();
  return () => {
    events.abort();
    preferences.revert();
    resize.disconnect();
    stopGlide();
    cancelAnimationFrame(paintFrame);
    track.classList.remove('gallery-parallax', 'is-dragging');
    cards.forEach(card => card.querySelector('img').style.removeProperty('transform'));
  };
}
const cleanupGallery = setupGallery();
if (import.meta.hot) import.meta.hot.dispose(cleanupGallery);

const reviewTrack = document.querySelector('.reviews-track');
const previousReview = document.querySelector('[data-review-prev]');
const nextReview = document.querySelector('[data-review-next]');
function moveReview(direction) {
  const left = reviewTrack.getBoundingClientRect().left;
  const positions = [...reviewTrack.children].map(card => card.getBoundingClientRect().left - left + reviewTrack.scrollLeft - 2);
  const current = reviewTrack.scrollLeft;
  const target = direction > 0 ? positions.find(position => position > current + 10) ?? reviewTrack.scrollWidth : [...positions].reverse().find(position => position < current - 10) ?? 0;
  reviewTrack.scrollTo({ left: target, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
function updateReviewControls() {
  previousReview.disabled = reviewTrack.scrollLeft <= 4;
  nextReview.disabled = reviewTrack.scrollLeft >= reviewTrack.scrollWidth - reviewTrack.clientWidth - 4;
}
previousReview.addEventListener('click', () => moveReview(-1));
nextReview.addEventListener('click', () => moveReview(1));
reviewTrack.addEventListener('scroll', updateReviewControls, { passive: true });
reviewTrack.addEventListener('keydown', event => {
  if (event.target === reviewTrack && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) { event.preventDefault(); moveReview(event.key === 'ArrowRight' ? 1 : -1); }
});
new ResizeObserver(updateReviewControls).observe(reviewTrack);
updateReviewControls();

const estimateForm = document.querySelector('#estimate-form');
function validateEstimateField(field) {
  if (!field.required) return;
  field.setCustomValidity(field.value.trim() ? '' : 'Please fill out this field.');
  if (field.name === 'phone' && field.value.trim()) {
    const digits = field.value.replace(/\D/g, '');
    field.setCustomValidity(digits.length >= 7 && digits.length <= 15 ? '' : 'Please enter a phone number with 7 to 15 digits.');
  }
}
estimateForm.addEventListener('input', event => validateEstimateField(event.target));
estimateForm.addEventListener('submit', event => {
  event.preventDefault();
  for (const field of event.currentTarget.querySelectorAll('input,select')) validateEstimateField(field);
  if (!event.currentTarget.reportValidity()) return;
  const data = new FormData(event.currentTarget);
  for (const [name, value] of data) if (typeof value === 'string') data.set(name, value.trim());
  const body = `Hello Vanguard,\n\nI'd like to discuss a ${data.get('service').toLowerCase()} project.\n\nName: ${data.get('name')}\nPhone: ${data.get('phone')}\nEmail: ${data.get('email')}\nLocation: ${data.get('location')}\n\n${data.get('message') || ''}\n\nThank you!`;
  const href = `mailto:Jonnysavoisbiz@gmail.com?subject=${encodeURIComponent('Estimate request: ' + data.get('service'))}&body=${encodeURIComponent(body)}`;
  const status = document.querySelector('#form-status'); status.replaceChildren(document.createTextNode('Your draft is ready. Send it from your email app. If it didn’t open, '));
  const retry = document.createElement('a'); retry.href = href; retry.textContent = 'open the draft again'; retry.style.textDecoration = 'underline'; status.append(retry, document.createTextNode(' or call (504) 884-0132.'));
  window.location.href = href;
});

estimateForm.querySelector('[type="submit"]').disabled = false;

const cleanupServiceRows = setupServiceRows();
if (import.meta.hot) import.meta.hot.dispose(cleanupServiceRows);

// Short, once-only entrances; the form rests in place during interaction.
function setupContactReveal() {
  const preferences = gsap.matchMedia();
  preferences.add('(prefers-reduced-motion: no-preference)', () => {
    const panel = document.querySelector('.contact-panel');
    const copy = panel.querySelector('.contact-copy');
    const form = panel.querySelector('form');
    const animations = [];
    const reveal = (elements, trigger, delay = 0) => {
      const animation = gsap.fromTo(elements,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: .65, stagger: .1, delay,
          ease: 'power2.out', clearProps: 'opacity,transform',
          scrollTrigger: { trigger, start: 'top 88%', once: true } });
      animations.push(animation);
      return animation;
    };
    const copyElements = [...copy.querySelectorAll('.contact-title-line'), ...copy.children].filter(el => el.tagName !== 'H2');
    reveal(copyElements, copy);
    const formAnimation = reveal(form, form, .12);
    // Keyboard focus immediately settles the form, even before its entrance.
    const settleForm = () => {
      formAnimation.scrollTrigger?.kill();
      formAnimation.kill();
      gsap.set(form, { clearProps: 'opacity,transform' });
    };
    form.addEventListener('focusin', settleForm);
    const backdrop = gsap.fromTo(panel, { '--contact-photo-scale': 1.05 },
      { '--contact-photo-scale': 1, duration: 1.4, ease: 'power2.out',
        scrollTrigger: { trigger: panel, start: 'top 88%', once: true } });
    animations.push(backdrop);
    return () => {
      form.removeEventListener('focusin', settleForm);
      animations.forEach(animation => { animation.scrollTrigger?.kill(); animation.kill(); });
    };
  });
  return () => preferences.revert();
}
const cleanupContactReveal = setupContactReveal();
if (import.meta.hot) import.meta.hot.dispose(cleanupContactReveal);
