import { test, expect } from '@playwright/test';

for (const width of [390,1440]) {
  test(`walkthrough follows scroll forward and back without autoplay at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');
    const canvas=page.locator('.kitchen-sequence-canvas');
    await expect(canvas).toHaveAttribute('data-frame-count','239');
    await expect(canvas).toHaveAttribute('data-frame','0');
    await expect(page.locator('header')).toHaveCount(1);
    const distance=await page.locator('.kitchen-scroll-shell').evaluate(el=>el.offsetHeight-document.querySelector('.hero').offsetHeight);
    for (const progress of [.25,.5,.75,1,.5,0]) {
      await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),distance*progress);
      await expect.poll(()=>canvas.getAttribute('data-frame')).toBe(String(Math.round(progress*238)));
      const atRest=await canvas.getAttribute('data-frame');
      await page.waitForTimeout(150);
      expect(await canvas.getAttribute('data-frame')).toBe(atRest);
      expect(await canvas.evaluate(el=>Number(el.dataset.cachedFrames))).toBeLessThanOrEqual(16);
      if (progress >= .5) {
        await expect(page.locator('#hero-title')).toHaveCSS('opacity','0');
        expect(await page.locator('.hero-bottom').evaluate(el=>el.inert)).toBe(true);
      }
    }
    await expect(page.locator('#hero-title')).toHaveCSS('opacity','1');
    await page.locator('.hero-actions a[href="#contact"]').click();
    await expect(page.locator('#contact')).toBeInViewport();
    expect(errors).toEqual([]);
  });
}

test('reduced motion removes the long stage and shows a static first frame', async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const canvas=page.locator('.kitchen-sequence-canvas');
  await expect(canvas).toHaveAttribute('data-frame','0');
  await expect(page.locator('.kitchen-scroll-shell')).not.toHaveClass(/sequence-active/);
  await expect(page.locator('#hero-title')).toHaveCSS('opacity','1');
  await page.locator('header a[href="#about"]').click();
  await expect(page.locator('#about')).toBeInViewport();
});

test('direct section links survive delayed sequence setup and resizing preserves progress', async ({page})=>{
  await page.route('**/kitchen-sequence/metadata.json',async route=>{await new Promise(resolve=>setTimeout(resolve,300));await route.continue();});
  await page.goto('/#contact');
  const canvas=page.locator('.kitchen-sequence-canvas');
  await expect(canvas).toHaveAttribute('data-frame-count','239');
  await expect(page.locator('#contact')).toBeInViewport();
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await expect(canvas).toHaveAttribute('data-frame','0');
  const distance=await page.locator('.kitchen-scroll-shell').evaluate(el=>el.offsetHeight-document.querySelector('.hero').offsetHeight);
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),distance*.5);
  await expect.poll(async ()=>Number(await canvas.getAttribute('data-frame'))).toBeGreaterThan(40);
  const before=Number(await canvas.getAttribute('data-frame'));
  await page.setViewportSize({width:1100,height:720});
  await expect.poll(async ()=>Number(await canvas.getAttribute('data-frame'))).toBeGreaterThanOrEqual(before-1);
});

test('progressive preload makes reverse scrubbing reuse downloaded frames', async ({page}) => {
  const requests = new Set();
  let frameRequests = 0;
  await page.route('**/kitchen-sequence/*.webp', async route => {
    await new Promise(resolve => setTimeout(resolve, 20));
    requests.add(route.request().url()); frameRequests++;
    await route.continue();
  });
  await page.goto('/');
  const canvas = page.locator('.kitchen-sequence-canvas');
  await expect(canvas).toHaveAttribute('data-frame','0');
  await expect.poll(() => requests.size, {timeout:15000}).toBe(239);
  await page.waitForTimeout(200);
  const downloaded = frameRequests;
  const distance = await page.locator('.kitchen-scroll-shell').evaluate(el => el.offsetHeight-document.querySelector('.hero').offsetHeight);
  for (const progress of [.8,.4,.1,.7,0]) {
    await page.evaluate(y => scrollTo({top:y,behavior:'instant'}), distance*progress);
    await expect.poll(() => canvas.getAttribute('data-frame')).toBe(String(Math.round(progress*238)));
  }
  expect(frameRequests).toBe(downloaded);
  expect(await canvas.evaluate(el => Number(el.dataset.cachedFrames))).toBeLessThanOrEqual(16);
});
