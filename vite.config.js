import { defineConfig, loadEnv } from 'vite';

export const DEMO_URL = 'https://vanguard-solutions-demo.example';
export const services = ["Kitchen & bathroom updates", "Decks, stairs & handrails", "Drywall & interior painting", "Doors, trim & flooring", "Storm & water damage repairs"];

export function createSiteMetadata(siteUrl = DEMO_URL, indexable = false) {
  const url = new URL(siteUrl);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) throw new Error('VITE_SITE_URL must be an HTTPS origin without a path, query or fragment.');
  const origin = url.origin;
  const home = `${origin}/`;
  const name = 'Vanguard Solutions LLC';
  const title = 'Home Repairs & Remodeling in New Orleans | Vanguard Solutions LLC';
  const description = 'Home repairs and residential remodeling across the West Bank and Greater New Orleans. Decks, kitchens, drywall, painting, doors and trim. Call or text for a free estimate.';
  const business = `${home}#business`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': business, name, url: home,
        logo: `${origin}/media/vanguard/vanguard-logo.png`, image: `${origin}/social-preview.jpg`,
        telephone: '+15048840132', email: 'Jonnysavoisbiz@gmail.com',
        areaServed: { '@type': 'Place', name: 'Greater New Orleans and West Bank, Louisiana' },
        sameAs: ['https://www.facebook.com/p/Vanguard-Solutions-LLC-61590535678883/'],
        contactPoint: { '@type': 'ContactPoint', telephone: '+15048840132', email: 'Jonnysavoisbiz@gmail.com', contactType: 'Estimate requests' }
      },
      { '@type': 'WebSite', '@id': `${home}#website`, url: home, name, publisher: { '@id': business }, inLanguage: 'en-US' },
      { '@type': 'WebPage', '@id': `${home}#webpage`, url: home, name: title, description, isPartOf: { '@id': `${home}#website` }, about: { '@id': business }, inLanguage: 'en-US' },
      ...services.map((name, i) => ({ '@type': 'Service', '@id': `${home}#service-${i + 1}`, name, url: `${home}#services`, provider: { '@id': business }, areaServed: { '@type': 'Place', name: 'Greater New Orleans and West Bank, Louisiana' } }))
    ]
  };
  return { origin, home, title, description, schema, indexable };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const site = createSiteMetadata(env.VITE_SITE_URL || DEMO_URL, env.VITE_INDEXABLE === 'true');
  const escape = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  return {
    build: { target: 'es2022' },
    plugins: [{
      name: 'template-search-metadata',
      transformIndexHtml(html) {
        return { html, tags: [
          { tag: 'link', attrs: { rel: 'canonical', href: site.home }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'robots', content: site.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow' }, injectTo: 'head' },
          ...Object.entries({ 'og:type':'website', 'og:locale':'en_US', 'og:site_name':'Vanguard Solutions LLC', 'og:title':site.title, 'og:description':site.description, 'og:url':site.home, 'og:image':`${site.origin}/social-preview.jpg`, 'og:image:width':'1200', 'og:image:height':'630', 'og:image:alt':'Vanguard porch renovation with gray decking and white railings' }).map(([property,content])=>({tag:'meta',attrs:{property,content},injectTo:'head'})),
          ...Object.entries({ 'twitter:card':'summary_large_image', 'twitter:title':site.title, 'twitter:description':site.description, 'twitter:image':`${site.origin}/social-preview.jpg`, 'twitter:image:alt':'Vanguard porch renovation with gray decking and white railings' }).map(([name,content])=>({tag:'meta',attrs:{name,content},injectTo:'head'})),
          { tag:'script', attrs:{type:'application/ld+json'}, children:JSON.stringify(site.schema).replaceAll('<','\\u003c'), injectTo:'head' }
        ] };
      },
      generateBundle() {
        this.emitFile({type:'asset',fileName:'robots.txt',source:site.indexable ? `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n'});
        this.emitFile({type:'asset',fileName:'sitemap.xml',source:`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(site.home)}</loc></url></urlset>\n`});
      }
    }, {
      name: 'template-inline-styles',
      apply: 'build',
      enforce: 'post',
      generateBundle(_options, bundle) {
        const html = bundle['index.html'];
        if (!html || html.type !== 'asset') return;
        html.source = String(html.source).replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, tag => {
          const href = tag.match(/href="([^"]+)"/)?.[1];
          const css = href && bundle[href.replace(/^\//, '')];
          return css?.type === 'asset' ? `<style>${String(css.source).replace(/<\/style/gi, '<\\/style')}</style>` : tag;
        });
      }
    }]
  };
});
