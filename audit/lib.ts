import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';

export const OUT_DIR = join(process.cwd(), 'docs', 'avaliacao');
export const SHOTS_DIR = join(OUT_DIR, 'telas');
mkdirSync(SHOTS_DIR, { recursive: true });

export function saveJson(name: string, data: unknown): void {
  writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 2), 'utf-8');
}

/** Latência de rede ida-e-volta Brasil ↔ Europa (SP–Frankfurt ≈ 200–230 ms) e banda de 4G/cabo médio. */
export const BR_TO_EU = { latency: 210, down: (10 * 1024 * 1024) / 8, up: (5 * 1024 * 1024) / 8 };

export async function throttle(
  context: BrowserContext,
  page: Page,
  profile: { latency: number; down: number; up: number } | null,
): Promise<void> {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile?.latency ?? 0,
    downloadThroughput: profile?.down ?? -1,
    uploadThroughput: profile?.up ?? -1,
  });
}

export type ApiCall = { method: string; path: string; status: number; ms: number; bytes: number };

/** Observa chamadas à API (porta 3333) com tempo total da requisição. */
export function trackApi(page: Page) {
  const calls: ApiCall[] = [];
  const errors: string[] = [];
  const started = new Map<unknown, number>();
  page.on('request', (req) => {
    if (req.url().includes(':3333/api/')) started.set(req, Date.now());
  });
  page.on('requestfinished', async (req) => {
    const t0 = started.get(req);
    if (t0 === undefined) return;
    const res = await req.response();
    const sizes = await req.sizes().catch(() => null);
    calls.push({
      method: req.method(),
      path: new URL(req.url()).pathname.replace('/api/v1', ''),
      status: res?.status() ?? 0,
      ms: Date.now() - t0,
      bytes: sizes?.responseBodySize ?? 0,
    });
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  return { calls, errors };
}

/** Heurísticas de acessibilidade/usabilidade executadas no navegador. */
export async function pageHeuristics(page: Page) {
  return page.evaluate(() => {
    const px = (v: string) => parseFloat(v) || 0;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const accName = (el: Element) =>
      (el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('title') ||
        (el as HTMLElement).innerText ||
        el.getAttribute('alt') ||
        '').trim();

    const buttons = [...document.querySelectorAll('button, [role=button], a[href]')].filter(visible);
    const unnamedButtons = buttons.filter((b) => !accName(b) && !b.querySelector('img[alt]')).length;
    const smallTargets = buttons.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width < 24 || r.height < 24;
    }).length;

    const inputs = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(visible);
    const unlabeledInputs = inputs.filter((i) => {
      const id = i.getAttribute('id');
      const hasFor = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
      return !hasFor && !i.closest('label') && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby') && !i.getAttribute('placeholder');
    }).length;

    const imgsNoAlt = [...document.querySelectorAll('img')].filter((i) => visible(i) && !i.hasAttribute('alt')).length;

    const textEls = [...document.querySelectorAll('p,span,a,button,label,li,td,th,h1,h2,h3,h4,div')]
      .filter((e) => visible(e) && e.children.length === 0 && (e.textContent ?? '').trim().length > 1)
      .slice(0, 600);
    let tiny = 0;
    let lowContrast = 0;
    const lum = (rgb: number[]) => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!);
    };
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const bgOf = (el: Element): number[] => {
      let n: Element | null = el;
      while (n) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c.length >= 3 && (c.length === 3 || (c[3] ?? 1) > 0.9)) return c;
        n = n.parentElement;
      }
      return [255, 255, 255];
    };
    for (const el of textEls) {
      const s = getComputedStyle(el);
      if (px(s.fontSize) < 12) tiny += 1;
      const fg = parse(s.color);
      if (fg.length < 3) continue;
      const bg = bgOf(el);
      const l1 = lum(fg);
      const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = px(s.fontSize) >= 18 || (px(s.fontSize) >= 14 && Number(s.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) lowContrast += 1;
    }

    const headings = [...document.querySelectorAll('h1,h2,h3')].filter(visible).map((h) => `${h.tagName}:${(h.textContent ?? '').trim().slice(0, 40)}`);
    return {
      title: document.title,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      interactive: buttons.length + inputs.length,
      unnamedButtons,
      smallTargets,
      unlabeledInputs,
      imgsNoAlt,
      tinyText: tiny,
      lowContrast,
      textSampled: textEls.length,
      h1Count: headings.filter((h) => h.startsWith('H1')).length,
      headings: headings.slice(0, 8),
      textLength: (document.body.innerText ?? '').length,
    };
  });
}
