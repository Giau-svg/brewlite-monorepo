// Local browser smoke test using installed Edge and Node 24 CDP; no extra library.
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const { spawn } = require('node:child_process');
const edge = process.env.BREWLITE_EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.env.BREWLITE_WEB_URL || 'http://localhost:3000';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  if (!fs.existsSync(edge)) throw new Error('Set BREWLITE_EDGE to an installed Edge/Chromium executable.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'brewlite-cdp-'));
  const proc = spawn(edge, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`], { windowsHide: true, stdio: 'ignore' });
  let ws;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await pause(100);
    const [port, endpoint] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
    ws = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    let sequence = 0; const pending = new Map(); const exceptions = [];
    ws.addEventListener('message', (event) => { const data = JSON.parse(String(event.data)); if (data.id) { const p = pending.get(data.id); if (p) { pending.delete(data.id); data.error ? p.reject(new Error(data.error.message)) : p.resolve(data.result); } } else if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text); });
    function call(method, params = {}, sessionId) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); }); }
    const target = await call('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await call('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    await call('Page.enable', {}, sessionId); await call('Runtime.enable', {}, sessionId);
    for (const [width, height, mobile] of [[1440, 1000, false], [390, 844, true]]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, sessionId);
      await call('Page.navigate', { url: `${base}/menu` }, sessionId); await pause(4000);
      const result = await call('Runtime.evaluate', { expression: 'JSON.stringify({width:innerWidth,scroll:document.documentElement.scrollWidth,cards:document.querySelectorAll(".bean-card").length})', returnByValue: true }, sessionId);
      const metrics = JSON.parse(result.result.value);
      const screenshot = await call('Page.captureScreenshot', { format: 'png' }, sessionId);
      const filename = path.join(os.tmpdir(), `brewlite-menu-${width}-verified.png`); fs.writeFileSync(filename, Buffer.from(screenshot.data, 'base64'));
      console.log(JSON.stringify({ ...metrics, screenshot: filename, runtimeExceptions: exceptions.length }));
      if (metrics.scroll > metrics.width) throw new Error(`Horizontal overflow: ${metrics.scroll} > ${metrics.width}`);
      if (!metrics.cards) throw new Error('No API product cards rendered.');
      if (exceptions.length) throw new Error('Browser runtime exception detected.');
    }
    await call('Browser.close');
  } finally { if (ws) ws.close(); if (proc.exitCode === null) proc.kill(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });