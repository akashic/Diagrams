// Export an archify diagram to a one-page vector PDF and a 2x PNG of just the diagram (with its title).
// Usage: node scripts/export-diagram.mjs export <diagram.html> <out-basename>   -> <out-basename>.pdf + .png
//        node scripts/export-diagram.mjs inspect <diagram.html>                 -> prints the page structure
// Drives headless Google Chrome over the DevTools protocol (Node >= 22 for the built-in WebSocket).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [mode, html, out] = process.argv.slice(2);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
  if (!target) await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, (m) => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

try {
  await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'light' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file://' + resolve(html) });
  await sleep(3500);

  if (mode === 'inspect') {
    console.log(await evaluate(`(() => {
      const svg = document.querySelector('svg[data-preset]');
      const chain = []; for (let n = svg; n && n !== document.body; n = n.parentElement) chain.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\\s+/).join('.') : ''));
      const top = [...document.body.children].map((c) => c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (typeof c.className === 'string' && c.className ? '.' + c.className.trim().split(/\\s+/).join('.') : ''));
      const vb = svg.viewBox.baseVal; const r = svg.getBoundingClientRect();
      return JSON.stringify({ chain, top, viewBox: [vb.width, vb.height], rect: [r.x, r.y, r.width, r.height] }, null, 1);
    })()`));
  } else {
    // Isolate the diagram SVG on an otherwise empty page at its natural viewBox size.
    const dims = await evaluate(`(() => {
      const svg = document.querySelector('svg[data-preset]');
      const vb = svg.viewBox.baseVal; const scale = 1.5;
      const w = Math.round(vb.width * scale), h = Math.round(vb.height * scale);
      const pad = 24, head = 64;
      const title = (document.querySelector('.toolbar h1, .toolbar .title, h1')?.textContent || document.title).trim();
      const host = document.createElement('div');
      host.id = '__export_host';
      // Keep the SVG inside its original ancestors so inherited CSS variables still apply; hide everything else.
      const style = document.createElement('style');
      style.textContent = \`
        @page { size: \${w + pad * 2}px \${h + pad * 2 + head}px; margin: 0; }
        #__export_title { visibility: visible !important; position: fixed; left: \${pad}px; top: \${pad}px; font: 600 26px/1.2 "Segoe UI", -apple-system, system-ui, sans-serif; color: #1f2937; z-index: 2147483647; }
        html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; overflow: hidden !important; }
        body * { visibility: hidden !important; }
        svg[data-preset], svg[data-preset] * { visibility: visible !important; }
        svg[data-preset] { position: fixed !important; left: \${pad}px !important; top: \${pad + head}px !important; width: \${w}px !important; height: \${h}px !important; max-width: none !important; max-height: none !important; transform: none !important; z-index: 2147483647 !important; background: #ffffff; }
        *, *::before, *::after { animation: none !important; transition: none !important; }\`;
      document.head.appendChild(style);
      const t = document.createElement('div'); t.id = '__export_title'; t.textContent = title; document.body.appendChild(t);
      window.scrollTo(0, 0);
      return { w: w + pad * 2, h: h + pad * 2 + head, title };
    })()`);
    await send('Emulation.setDeviceMetricsOverride', { width: dims.w, height: dims.h, deviceScaleFactor: 2, mobile: false });
    await sleep(800);
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, pageRanges: '1', paperWidth: dims.w / 96, paperHeight: dims.h / 96, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    writeFileSync(out + '.pdf', Buffer.from(pdf.data, 'base64'));
    const png = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: dims.w, height: dims.h, scale: 1 } });
    writeFileSync(out + '.png', Buffer.from(png.data, 'base64'));
    console.log(JSON.stringify({ out, ...dims }));
  }
} finally {
  ws.close(); chrome.kill();
}
