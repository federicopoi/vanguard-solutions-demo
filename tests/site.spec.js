import { test, expect } from '@playwright/test';


test('desktop media, projects, and form validation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: 'HOMES, REIMAGINED.' })).toBeVisible();
  await expect(page.locator('.project:visible')).toHaveCount(6);
  await page.locator('button[data-project="porch-front"]').first().click();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('dialog img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'View deck detail project' }).click();
  await expect(page.locator('dialog img')).toHaveAttribute('src', '/media/vanguard/gallery-deck-detail.webp');
  await page.keyboard.press('Escape');
  await expect(page.getByText('Cabinet refinishing and installation', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare my estimate request' }).click();
  expect(await page.locator('#estimate-form').evaluate(form => form.checkValidity())).toBe(false);
  await page.getByLabel('Full name*').fill('Local QA');
  await page.getByLabel('Phone number*').fill('4705550100');
  await page.getByLabel('Email address*').fill('test@example.com');
  await page.getByLabel('What are you planning?*').selectOption('Kitchen & bathroom updates');
  await page.getByLabel('Project location*').fill('Cumming');
  await page.getByLabel('A little about your project').fill('New cabinets & tile, please.');
  expect(await page.locator('#estimate-form').evaluate(form => form.checkValidity())).toBe(true);
  // Prevent opening an external mail client; verify the prepared mailto draft only.
  await page.route('mailto:**', route => route.abort());
  await page.getByRole('button', { name: 'Prepare my estimate request' }).click();
  await expect(page.locator('#form-status')).toContainText('Your draft is ready');
  await expect(page.locator('#form-status a')).toHaveAttribute('href', /mailto:Jonnysavoisbiz@gmail.com\?subject=Estimate%20request/);
  const draft = new URL(await page.locator('#form-status a').getAttribute('href'));
  expect(draft.pathname).toBe('Jonnysavoisbiz@gmail.com');
  expect(draft.searchParams.get('subject')).toBe('Estimate request: Kitchen & bathroom updates');
  for (const text of ['Local QA', '4705550100', 'test@example.com', 'Cumming', 'New cabinets & tile, please.']) expect(draft.searchParams.get('body')).toContain(text);
  await expect(page.locator('.contact-email')).toHaveAttribute('href', 'mailto:Jonnysavoisbiz@gmail.com');
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
  await page.locator('.footer').scrollIntoViewIfNeeded();
  const broken = await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src));
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
  await page.locator('.footer').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
});

for (const width of [1440, 844]) {
  test(`gallery stays centered and scrubs when scrolling outside the photos at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
    await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const gallery = page.locator('#projects');
    const track = page.locator('.gallery-track');
    const top = await gallery.evaluate(el => el.getBoundingClientRect().top + scrollY);
    await page.evaluate(top => window.scrollTo({ top: top + 2, behavior: 'instant' }), top);
    await expect(page.locator('#projects .round-arrow, #projects .gallery-controls')).toHaveCount(0);
    const initial = await track.evaluate(el => el.scrollLeft);
    const position = await track.boundingBox();
    // The cursor is in the outer white margin, not over the photo track.
    await page.mouse.move(3, 60);
    await page.mouse.wheel(0, 320);
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(initial + 200);
    const moved = await track.boundingBox();
    expect(Math.abs(moved.y - position.y)).toBeLessThan(3);
    expect(moved.y).toBeGreaterThan(0);
    expect(moved.y + moved.height).toBeLessThanOrEqual(width === 844 ? 390 : 900);
    const outsideProgress = await track.evaluate(el => el.scrollLeft);
    await page.mouse.move(width / 2, moved.y + moved.height / 2);
    await page.mouse.wheel(0, 160);
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(outsideProgress + 100);
    expect(Math.abs((await track.boundingBox()).y - moved.y)).toBeLessThan(3);
    const distance = await track.evaluate(el => el.scrollWidth - el.clientWidth);
    await page.mouse.wheel(0, distance + 500);
    await expect.poll(() => track.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft)).toBeLessThan(3);
    await expect.poll(async () => (await gallery.boundingBox()).y).toBeLessThan(-100);
  });
}

test('gallery supports keyboard and drag, with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  const track = page.locator('.gallery-track');
  await track.scrollIntoViewIfNeeded();
  await track.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  await page.keyboard.press('Home');
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeLessThan(5);
  const box = await track.boundingBox();
  await page.mouse.move(box.x + 220, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 50, box.y + 100, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(150);
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(track.locator('img').first()).toHaveCSS('transform', 'none');
});

test('review carousel supports arrows, keyboard navigation, and end states', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  const track = page.locator('.reviews-track');
  await page.locator('#reviews').scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Previous review', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Next review', exact: true }).click();
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Previous review', exact: true }).click();
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeLessThan(5);
  await track.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  await track.evaluate(el => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
  await expect(page.getByRole('button', { name: 'Next review', exact: true })).toBeDisabled();
});

for (const width of [390, 768, 1280]) {
  test(`responsive layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const heading = await page.locator('h1').boundingBox();
    expect(heading.x + heading.width).toBeLessThanOrEqual(width);
    if (width === 390) {
      await page.getByRole('button', { name: 'Menu' }).click();
      await expect(page.getByRole('navigation')).toBeVisible();
      await page.getByRole('navigation').getByRole('link', { name: 'Services', exact: true }).click();
      await expect(page.getByRole('navigation')).not.toBeVisible();
      await page.getByRole('button', { name: 'Menu' }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
      await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
    }
  });
}

for (const width of [1440, 390]) {
  test(`team photo expands to the screen edge at ${width}px without moving the copy`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const photo = page.locator('.team-photo');
    const frame = page.locator('.team-photo-frame');
    const photoTop = await photo.evaluate(el => el.getBoundingClientRect().top + scrollY);
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), photoTop - 900 * .95);
    await expect(frame).toBeAttached();
    await expect.poll(async () => (await frame.boundingBox()).x).toBeGreaterThan(15);
    const copyLeft = (await page.locator('.team-copy').boundingBox()).x;
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), photoTop - 900 * .3);
    await expect.poll(async () => Math.abs((await frame.boundingBox()).x)).toBeLessThan(1);
    const sectionTop = (await page.locator('#about').boundingBox()).y;
    expect((await frame.boundingBox()).y).toBeCloseTo(sectionTop, 0);
    if (width === 390) {
      const bounds = await frame.boundingBox();
      expect(bounds.x + bounds.width).toBeCloseTo(width, 0);
    }
    expect((await page.locator('.team-copy').boundingBox()).x).toBeCloseTo(copyLeft, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), photoTop - 900 * .95);
    await expect.poll(async () => Math.abs((await frame.boundingBox()).x)).toBeLessThan(1);
  });
}

for (const width of [1440, 390]) {
  test(`five service rows have distinct photos and expand without moving the following rows at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const rows = page.locator('.service-row');
    await expect(rows).toHaveCount(5);
    await expect(page.locator('#services details')).toHaveCount(0);
    const sources = await rows.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src')));
    expect(new Set(sources).size).toBe(5);
    await rows.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
    const first = rows.first();
    const top = await (width === 390 ? first.locator('.service-media') : first).evaluate(el => el.getBoundingClientRect().top + scrollY);
    const followingTop = await rows.nth(1).evaluate(el => el.getBoundingClientRect().top + scrollY);
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), top - 900 * .9);
    const small = await first.locator('.service-image-frame').boundingBox();
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), top - 900 * .2);
    await expect.poll(async () => (await first.locator('.service-image-frame').boundingBox()).width).toBeGreaterThan(small.width + 40);
    expect(await rows.nth(1).evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(followingTop, 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const frame = await first.locator('.service-image-frame').boundingBox();
    const media = await first.locator('.service-media').boundingBox();
    expect(frame.width).toBeCloseTo(media.width, 0);
    expect(frame.height).toBeCloseTo(media.height, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#services a[href="#contact"]')).toHaveCount(6);
  });
}

test('page scrolling continues over review cards and into contact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#reviews').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }));
  const start = await page.evaluate(() => scrollY);
  await page.mouse.move(3, 250);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(start + 100);
  const beforeCards = await page.evaluate(() => scrollY);
  const cards = await page.locator('.reviews-track').boundingBox();
  await page.mouse.move(cards.x + 150, Math.max(20, cards.y + 100));
  await page.mouse.wheel(0, 240);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeCards + 180);
  await page.mouse.move(3, 250);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.locator('#contact').evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(500);
  await page.mouse.wheel(0, 10000);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY)).toBeLessThan(3);
});

test('photo viewer opens the selected image and browses the gallery', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  const selected = page.locator('#projects [data-project="kitchen-sink"]');
  await selected.click();
  const viewer = page.locator('dialog');
  const photo = viewer.locator('img');
  await expect(photo).toHaveAttribute('src', '/media/vanguard/gallery-kitchen-sink.webp');
  await expect(viewer.locator('.lightbox-count')).toHaveText('3 / 6');
  await expect(viewer.locator('.dialog-copy')).toHaveCount(0);
  await viewer.getByRole('button', { name: 'Next photo' }).click();
  await expect(photo).toHaveAttribute('src', '/media/vanguard/gallery-kitchen-entry.webp');
  await page.keyboard.press('ArrowLeft');
  await expect(photo).toHaveAttribute('src', '/media/vanguard/gallery-kitchen-sink.webp');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(photo).toHaveAttribute('src', '/media/vanguard/gallery-deck-detail.webp');
  await expect(viewer.locator('.lightbox-count')).toHaveText('6 / 6');
  await viewer.getByRole('button', { name: 'Next photo' }).click();
  await expect(viewer.locator('.lightbox-count')).toHaveText('1 / 6');
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(selected).toBeFocused();
  await selected.click();
  await viewer.getByRole('button', { name: 'Close preview' }).click();
  await expect(viewer).not.toBeVisible();
});

test('mobile gallery preserves its photo position when browser height changes', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  const gallery = page.locator('#projects');
  const top = await gallery.evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(top => window.scrollTo({ top: top + 300, behavior: 'instant' }), top);
  const track = page.locator('.gallery-track');
  await track.evaluate(el => el.scrollTo({ left: 330, behavior: 'instant' }));
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(290);
  const initial = await track.evaluate(el => el.scrollLeft);
  await page.setViewportSize({ width: 390, height: 744 });
  await page.waitForTimeout(450);
  expect(Math.abs(await track.evaluate(el => el.scrollLeft) - initial)).toBeLessThan(5);
  await context.close();
});

test('mobile touch swipes advance the gallery and continue through reviews to the footer', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const touch = await context.newCDPSession(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  const track = page.locator('.gallery-track');
  await expect(page.locator('#projects')).not.toHaveClass(/gallery-scroll-scene/);
  await track.scrollIntoViewIfNeeded();
  const box = await track.boundingBox();
  const y = Math.min(650, box.y + box.height / 2);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 340, y }] });
  for (let step = 1; step <= 12; step++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 340 - step * 24, y }] });
    await page.waitForTimeout(25);
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(200);
  await page.waitForTimeout(500);
  const horizontalPosition = await track.evaluate(el => el.scrollLeft);

  for (let swipe = 0; swipe < 22; swipe++) {
    const before = await page.evaluate(() => scrollY);
    const x = swipe % 2 ? 195 : 6;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 700 }] });
    for (let step = 1; step <= 12; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 700 - step * 40 }] });
      await page.waitForTimeout(25);
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({ y: scrollY, remaining: document.documentElement.scrollHeight - innerHeight - scrollY, left: document.querySelector('.gallery-track').scrollLeft }));
    expect(Math.abs(state.left - horizontalPosition)).toBeLessThan(5);
    await expect(page.locator('dialog')).not.toBeVisible();
    if (state.remaining < 5) break;
    expect(state.y).toBeGreaterThan(before + 10);
  }

  expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY)).toBeLessThan(5);
  await context.close();
});

test('landscape phones use native gallery scrolling and switch cleanly to desktop', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#estimate-form button')).toBeEnabled();
  const gallery = page.locator('#projects');
  await expect(gallery).not.toHaveClass(/gallery-scroll-scene/);
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(gallery).toHaveClass(/gallery-scroll-scene/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(gallery).not.toHaveClass(/gallery-scroll-scene/);
  expect(await gallery.evaluate(el => el.parentElement.classList.contains('pin-spacer'))).toBe(false);
  await context.close();
});

test('phone contact photo is contained above the form and the menu has no visible label', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#estimate-form button')).toBeEnabled();
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  expect(await menu.innerText()).toBe('');
  expect((await menu.boundingBox()).width).toBeGreaterThanOrEqual(48);
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  const copy = await page.locator('.contact-copy').boundingBox();
  const form = await page.locator('#estimate-form').boundingBox();
  expect(copy.height).toBeLessThan(420);
  await expect.poll(async () => {
    const copyBounds = await page.locator('.contact-copy').boundingBox();
    const formBounds = await page.locator('#estimate-form').boundingBox();
    return Math.abs(formBounds.y - copyBounds.y - copyBounds.height);
  }).toBeLessThan(1);
  await expect(page.locator('#estimate-form')).toHaveCSS('background-color', 'rgb(238, 238, 231)');
  const fields = await page.locator('.form-row label').evaluateAll(labels => labels.map(el => el.getBoundingClientRect().top));
  expect(fields[0]).toBe(fields[1]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
