# Vanguard Solutions LLC — website demo

Separate client demo based on the Oakline template. Oakline and the original Elite site remain unchanged.

Preview: `npm ci`, then `npm run dev -- --port 5180 --strictPort`.
Open http://127.0.0.1:5180/. Build with `npm run build`; browser checks use `npm test`.

## Business information

- Vanguard Solutions LLC
- Call/text: (504) 884-0132
- Email: Jonnysavoisbiz@gmail.com
- Area: West Bank and Greater New Orleans, Louisiana
- Facebook: https://www.facebook.com/p/Vanguard-Solutions-LLC-61590535678883/
- Google review link: https://g.page/r/CVN_tikhmslaEBI/review

Services are taken from the supplied Facebook export. Hours, an owner identity, star ratings and review quotations were not supplied and have not been invented. The review section links to the real review destinations. The estimate form validates the request and prepares an email draft to the company; it does not silently send submissions to a server.

## Imagery

The regenerated project images are based on the supplied porch, kitchen, room and storm-damage photographs. The About photo shows porch framing rather than a fictional owner. `references/` contains the downloaded source images and their public-post links.

- `public/media/vanguard/`: responsive WebP images and the regenerated transparent logo.
- `output/4k/`: 3840 × 2160 landscape and 2160 × 3840 portrait JPEG master exports.
- `docs/image-manifest.json`: original generated resolution, final export resolution, source reference and prompt for each image. The image tool returned smaller native files; the 4K exports are upscaled from those generated files. They are not native 4K captures.
- The existing kitchen hero walkthrough remains illustrative demo footage, clearly identified in the image note. It is not labelled as Vanguard’s completed kitchen.

The design, typography, responsive navigation, desktop horizontal scroll gallery, mobile swiping, photo lightbox, service reveals and reduced-motion support are retained. Search indexing stays off while this is a client demo. No deployment was made for this copy.
