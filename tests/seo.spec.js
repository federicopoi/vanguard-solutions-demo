import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import { createSiteMetadata } from '../vite.config.js';

const home = 'https://vanguard-solutions-demo.example/';

test('search metadata is present in the initial HTML and business facts agree', async ({ request }) => {
  const response = await request.get('/');
  const html = await response.text();
  expect(html).toContain('<title>Home Repairs &amp; Remodeling in New Orleans | Vanguard Solutions LLC</title>');
  expect(html).toContain(`href="${home}"`);
  expect(html).toContain('property="og:image"');
  expect(html).toContain('noindex, follow');
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const organization = schema['@graph'].find(item => item['@type'] === 'Organization');
  expect(organization.telephone).toBe('+15048840132');
  expect(organization.email).toBe('Jonnysavoisbiz@gmail.com');
  expect(organization.contactPoint).not.toHaveProperty('hoursAvailable');
  expect(schema['@graph'].filter(item => item['@type'] === 'Service')).toHaveLength(5);
  expect(JSON.stringify(schema)).not.toMatch(/aggregateRating|reviewCount|streetAddress/);
  expect((html.match(/<h1\b/g) || []).length).toBe(1);
});

test('crawler files use the actual deployment URL and domain changes update metadata', async () => {
  const robots = await fs.readFile('dist/robots.txt', 'utf8');
  const sitemap = await fs.readFile('dist/sitemap.xml', 'utf8');
  expect(robots).toContain('Disallow: /');
  expect(robots).not.toContain('<html');
  expect(sitemap).toContain(`<loc>${home}</loc>`);
  const final = createSiteMetadata('https://construction-website-template.example', false);
  expect(final.home).toBe('https://construction-website-template.example/');
  expect(final.indexable).toBe(false);
  expect(JSON.stringify(final.schema)).not.toContain('pages.dev');
  expect(() => createSiteMetadata('http://example.com')).toThrow();
  expect(() => createSiteMetadata('https://example.com/path')).toThrow();
});

for (const width of [390, 768, 1440]) {
  test(`WCAG automated checks and image semantics at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(result.violations).toEqual([]);
    const images = await page.locator('main img').evaluateAll(images => images.map(img=>({alt:img.alt,loading:img.loading,width:img.width,height:img.height})));
    expect(images.every(img=>img.alt.trim().length>0)).toBe(true);
    expect(images.slice(1).every(img=>img.loading==='lazy')).toBe(true);
    expect(await page.locator('.hero-image').evaluate(img=>img.currentSrc)).toMatch(width<=760?/kitchen-sequence\/mobile\/frame-0001/:/kitchen-sequence\/frame-0001/);
    await page.getByRole('button',{name:'View porch front project'}).click();
    const modalResult = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(modalResult.violations).toEqual([]);
    await page.keyboard.press('Escape');
  });
}

test('whitespace and non-numeric phone submissions are rejected', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  await page.getByLabel('Full name*').fill('   ');
  await page.getByLabel('Phone number*').fill('.......');
  await page.getByLabel('Email address*').fill('test@example.com');
  await page.getByLabel('What are you planning?*').selectOption('Kitchen & bathroom updates');
  await page.getByLabel('Project location*').fill('Atlanta');
  expect(await page.locator('#estimate-form').evaluate(form=>form.checkValidity())).toBe(false);
  await page.getByLabel('Full name*').fill('Homeowner');
  await page.getByLabel('Phone number*').fill('(504) 884-0132');
  expect(await page.locator('#estimate-form').evaluate(form=>form.checkValidity())).toBe(true);
});

test('services, contact information and headings remain readable without JavaScript', async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:5180/');
  await expect(page.locator('h1')).toHaveText('HOMES, REIMAGINED.');
  await expect(page.locator('.service-info h3')).toHaveCount(5);
  await expect(page.locator('.contact-email')).toHaveText('Jonnysavoisbiz@gmail.com');
  await expect(page.locator('#estimate-form')).toBeHidden();
  await expect(page.getByRole('link',{name:'Email your project details'})).toHaveAttribute('href','mailto:Jonnysavoisbiz@gmail.com');
  await context.close();
});

test('skip link and mobile menu work with the keyboard', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prepare my estimate request' })).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.getByRole('button',{name:'Menu'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeHidden();
  await expect(page.getByRole('button',{name:'Menu'})).toBeFocused();
});

test('an early menu click survives delayed runtime loading', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.route('**/src/main.js',async route=>{
    await new Promise(resolve=>setTimeout(resolve,400));
    await route.continue();
  });
  await page.goto('/',{waitUntil:'commit'});
  await page.getByRole('button',{name:'Menu'}).click();
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeHidden();
});

test('production CSS is inlined and the animation bundle is not eagerly loaded', async()=>{
  const html=await fs.readFile('dist/index.html','utf8');
  expect(html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '')).not.toMatch(/<link\b[^>]*rel="stylesheet"/);
  expect(html).toContain('@font-face');
  expect(html).not.toMatch(/rel="modulepreload"[^>]*main-/);
  expect(html).toContain('display-hero.woff2');
});
