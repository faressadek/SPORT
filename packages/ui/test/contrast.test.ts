import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Reads the token blocks out of styles.css so the test checks what ships. */
const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`missing ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const vars: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/--c-([a-z-]+):\s*(#[0-9a-f]{6})/gi))
    vars[m[1]!] = m[2]!;
  return vars;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

// [foreground, background] pairs used for text (WCAG AA 4.5:1).
const TEXT_PAIRS: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'sunken'],
  ['ink', 'neutral-soft'],
  ['ink-muted', 'bg'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'sunken'],
  ['on-pitch', 'pitch'],
  ['on-pitch', 'pitch-raised'],
  ['on-pitch-muted', 'pitch'],
  ['on-action', 'action'],
  ['on-action', 'action-hover'],
  ['on-action', 'action-press'],
  ['link', 'bg'],
  ['link', 'surface'],
  ['success', 'success-soft'],
  ['warning', 'warning-soft'],
  ['danger', 'danger-soft'],
  ['danger', 'surface'],
  ['info', 'info-soft'],
  ['ink', 'danger-soft'],
];

// Boundaries and indicators that carry meaning (WCAG 1.4.11, 3:1).
const UI_PAIRS: [string, string][] = [
  ['focus', 'bg'],
  ['focus', 'surface'],
  ['line-strong', 'surface'],
  ['line-strong', 'bg'],
];

const themes = { light: block(':root {'), dark: block(":root[data-theme='dark']") };

describe.each(Object.entries(themes))('%s theme contrast', (_name, t) => {
  it.each(TEXT_PAIRS)('%s on %s ≥ 4.5', (fg, bg) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(UI_PAIRS)('%s against %s ≥ 3', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3);
  });
});

it('dark tokens in the media query match the [data-theme=dark] block', () => {
  const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  const fromMedia = block(":root:not([data-theme='light'])");
  expect(media.length).toBeGreaterThan(0);
  expect(fromMedia).toEqual(themes.dark);
});
