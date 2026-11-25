import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('public/assets/yaba-street-library/signage');
await mkdir(output, { recursive: true });
const signs = [
  ['yaba-provisions', 'YABA PROVISIONS', 'GROCERY • HOUSEHOLD • DAILY NEEDS', '#183C36', '#F2C14E', '#F5F1E8'],
  ['mide-phone-repairs', 'MIDE PHONE REPAIRS', 'SALES • REPAIRS • ACCESSORIES', '#182B49', '#F5A623', '#F8F6F0'],
  ['fresh-cut-barbers', 'FRESH CUT BARBERS', 'CLEAN CUTS • WALK INS WELCOME', '#132C31', '#D55B48', '#F7F4EA'],
  ['mama-ts-kitchen', "MAMA T'S KITCHEN", 'RICE • BEANS • SOUP • SWALLOW', '#702D2D', '#F2C14E', '#FFF5E3'],
  ['akara-and-pap', 'AKARA & PAP', 'HOT • FRESH • MADE DAILY', '#4B3423', '#D9A441', '#FFF1D3'],
  ['suya-and-grill', 'SUYA & GRILL', 'SPICED • SMOKED • FRESH', '#3B2520', '#E36B32', '#FFF0D8'],
  ['pos-and-transfers', 'POS & TRANSFERS', 'CASH OUT • TRANSFERS • PAYMENTS', '#174B3B', '#E8C547', '#F5F4E9'],
  ['cold-drinks', 'COLD DRINKS', 'WATER • SODA • JUICE', '#17436B', '#4FB5CE', '#F5F7F4'],
];
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
for (const [slug, title, subtitle, bg, accent, fg] of signs) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512">
  <rect width="1024" height="512" fill="${bg}"/>
  <rect x="18" y="18" width="988" height="476" rx="34" fill="none" stroke="${accent}" stroke-width="16"/>
  <path d="M40 40H984V92H40Z M40 420H984V468H40Z" fill="${accent}"/>
  <circle cx="202" cy="276" r="130" fill="${accent}" stroke="${fg}" stroke-width="9"/>
  <circle cx="202" cy="276" r="102" fill="none" stroke="${fg}" stroke-width="5"/>
  <text x="202" y="316" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-weight="700" font-size="116" fill="${bg}">${esc(title[0])}</text>
  <text x="950" y="246" text-anchor="end" textLength="590" lengthAdjust="spacingAndGlyphs" font-family="DejaVu Sans, sans-serif" font-weight="700" font-size="72" fill="${fg}">${esc(title)}</text>
  <text x="950" y="324" text-anchor="end" textLength="600" lengthAdjust="spacingAndGlyphs" font-family="DejaVu Sans, sans-serif" font-weight="700" font-size="30" fill="${accent}">${esc(subtitle)}</text>
  <text x="56" y="453" font-family="DejaVu Sans, sans-serif" font-weight="700" font-size="20" fill="${bg}" letter-spacing="2">YABA • NAIJA CITY</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(resolve(output, `${slug}.png`));
}
console.log(`Generated ${signs.length} Nigerian street-sign textures at ${output}`);
