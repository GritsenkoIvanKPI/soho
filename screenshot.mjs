// usage: node screenshot.mjs <url> [label] [--mobile] [--viewport]
import { createRequire } from 'node:module';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let puppeteer;
for (const p of [process.env.PUPPETEER_PATH, 'puppeteer', 'puppeteer-core'].filter(Boolean)) {
  try { puppeteer = require(p); break; } catch {}
}
if (!puppeteer) { console.error('puppeteer not found — set PUPPETEER_PATH'); process.exit(1); }

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http')) || 'http://localhost:3000';
const label = args.find(a => !a.startsWith('http') && !a.startsWith('--'));
const mobile = args.includes('--mobile');
const viewportOnly = args.includes('--viewport');

const dir = join(fileURLToPath(new URL('.', import.meta.url)), 'temporary screenshots');
await mkdir(dir, { recursive: true });
const nums = (await readdir(dir)).map(f => +(f.match(/^screenshot-(\d+)/)?.[1] || 0));
const n = Math.max(0, ...nums) + 1;
const out = join(dir, `screenshot-${n}${label ? '-' + label : ''}.png`);

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true } : { width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
// trigger scroll-reveal animations
await page.evaluate(async () => {
  const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
  window.scrollTo(0, 0);
});
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: out, fullPage: !viewportOnly });
await browser.close();
console.log(out);
