// Browser check for the UI kit and shells: screenshots at 390px and 1280px in
// light and dark (and RTL), an axe WCAG 2.1 AA scan, horizontal overflow and
// touch targets under 44px.
//
//   node packages/ui/scripts/check-pages.mjs http://127.0.0.1:3000 out/shots
//
// The app must be built with ENABLE_DEV_UI=true (or run with `next dev`).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const out = process.argv[3] ?? 'shots';
mkdirSync(out, { recursive: true });

const PAGES = [
  ['dev-ui', '/dev/ui'],
  ['athlete-home', '/'],
  ['operator-dashboard', '/dashboard'],
  ['admin-shell', '/dev/ui/shells/admin'],
];
const WIDTHS = [390, 1280];
const THEMES = ['light', 'dark'];

const browser = await chromium.launch();
const report = [];
let failed = false;

async function check(name, path, width, theme, rtl = false) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: theme,
  });
  const page = await context.newPage();
  const q = new URLSearchParams({ theme, ...(rtl ? { dir: 'rtl' } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on(
    'console',
    (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()),
  );
  await page.goto(`${base}${path}?${q}`, { waitUntil: 'load' });
  await page.evaluate(
    ([t, r]) => {
      document.documentElement.dataset.theme = t;
      if (r) {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
      }
    },
    [theme, rtl],
  );
  await page.waitForTimeout(800);
  const tag = `${name}-${width}-${theme}${rtl ? '-rtl' : ''}`;
  await page.screenshot({ path: join(out, `${tag}.png`), fullPage: true });

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('a[href], button, [role="radio"], input, select, textarea')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (
          !r.width ||
          !r.height ||
          s.visibility === 'hidden' ||
          el.closest('.sr-only, [aria-hidden="true"]')
        )
          return false;
        if (el.matches('input[type="checkbox"], input[type="file"]')) return false; // the whole label is the target
        if (el.closest('p') && el.tagName === 'A') return false; // inline text links are exempt (WCAG 2.5.8)
        if (el.className.includes('after:inset-0')) return false; // stretched link: the whole card is the target
        return r.width < 44 - 0.5 || r.height < 44 - 0.5;
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
      ),
  );
  const entry = {
    tag,
    axe: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes
        .slice(0, 4)
        .map((n) => n.target.join(' ') + ' :: ' + n.failureSummary?.split('\n')[1]),
    })),
    overflowPx: overflow,
    smallTargets: [...new Set(small)].slice(0, 20),
    errors,
  };
  if (entry.axe.length || overflow > 0 || entry.smallTargets.length || errors.length) failed = true;
  report.push(entry);
  console.log(
    `${tag}: axe ${entry.axe.length}, overflow ${overflow}px, small targets ${entry.smallTargets.length}, errors ${errors.length}`,
  );
  await context.close();
}

for (const [name, path] of PAGES)
  for (const w of WIDTHS) for (const t of THEMES) await check(name, path, w, t);
await check('dev-ui', '/dev/ui', 390, 'light', true);
await check('athlete-home', '/', 390, 'light', true);
await check('operator-dashboard', '/dashboard', 1280, 'dark', true);

writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
process.exitCode = failed ? 1 : 0;
