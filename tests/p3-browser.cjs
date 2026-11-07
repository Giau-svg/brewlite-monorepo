// Real Next.js UI -> real NestJS -> dedicated P3 database. No API response mocking.
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os'); const { spawn } = require('node:child_process');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  const settings = JSON.parse(process.env.P3_BROWSER_SETTINGS || '{}');
  if (!settings.database?.startsWith('brewlite_p3_test_')) throw new Error('A dedicated P3 backend is mandatory');
  const edge = process.env.BREWLITE_EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'brewlite-p3-browser-'));
  const processEdge = spawn(edge, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    const file = path.join(profile, 'DevToolsActivePort'); for (let i = 0; i < 100 && !fs.existsSync(file); i++) await pause(100);
    const [port, endpoint] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/); socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    const pending = new Map(); const errors = []; let sequence = 0; let requests = 0; let session;
    function call(method, params = {}, sessionId = session) { return new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser timeout: ${method}`)); }, 15000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); }); }
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) { const item = pending.get(message.id); if (item) { clearTimeout(item.timer); pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result); } }
      else if (message.method === 'Runtime.exceptionThrown') errors.push('runtime exception');
      else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error' && message.params.args.some((a) => /hydration|did not match/i.test(String(a.value)))) errors.push('hydration error');
      else if (message.method === 'Fetch.requestPaused') {
        // Redirect transport only. Every business response comes from the real isolated Nest app.
        const original = new URL(message.params.request.url); const destination = new URL(settings.api);
        original.protocol = destination.protocol; original.host = destination.host;
        requests++;
        void call('Fetch.continueRequest', { requestId: message.params.requestId, url: original.toString() }, message.sessionId).catch(() => errors.push('transport redirect failed'));
      }
    });
    const target = await call('Target.createTarget', { url: 'about:blank' }); session = (await call('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
    await call('Page.enable'); await call('Runtime.enable'); await call('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
    const evaluate = async (expression) => { const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error('Browser evaluation failed'); return result.result.value; };
    const wait = async (expression, label) => { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(200); } console.error(JSON.stringify({ label, text: await evaluate('document.body.innerText.slice(-2200)'), requests })); throw new Error(`UI condition failed: ${label}`); };
    const navigate = async (pathname) => { await call('Page.navigate', { url: 'http://localhost:3000' + pathname }); };
    const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
    const fill = (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error();Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const screenshot = async (name, width, height, mobile) => { await call('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: 1 }); await pause(400); const metrics = await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})'); if (metrics.scroll > metrics.width) throw new Error(`Horizontal overflow: ${name}`); const result = await call('Page.captureScreenshot', { format: 'png' }); const filename = path.join(os.tmpdir(), `brewlite-p3-${name}.png`); fs.writeFileSync(filename, Buffer.from(result.data, 'base64')); console.log(JSON.stringify({ screen: name, ...metrics, screenshot: filename })); };
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, mobile: false, deviceScaleFactor: 1 });
    await navigate('/products/' + settings.productId);
    await wait("document.querySelector('.add-bag')", 'guest product loaded from test database');
    await evaluate("Array.from(document.querySelectorAll('.choice-row button')).find(e=>e.textContent.trim().startsWith('M ·')).click()");
    await wait("!document.querySelector('.add-bag').disabled", 'available size selected');
    if (!await evaluate("document.body.innerText.includes('P3 Browser Drink')") || !requests) throw new Error('Test backend not confirmed; refusing actions');
    await fill('#note', 'P3 guest note'); await click('.add-bag');
    await wait("document.querySelector('.cart-success')", 'guest addition');
    if (!await evaluate(`location.pathname===${JSON.stringify('/products/' + settings.productId)}`)) throw new Error('Add automatically navigated to cart');
    await navigate('/login'); await wait("document.querySelector('#auth-email')", 'login');
    async function login(email) { await fill('#auth-email', email); await fill('#auth-password', settings.password); await evaluate("document.querySelector('#auth-password').closest('form').requestSubmit()"); await wait("location.pathname==='/menu'", 'login completed'); }
    await login(settings.customer);
    await wait("JSON.parse(sessionStorage.getItem('brewlite-config-cart')||'[]').length===0 && document.querySelector('.cart-count')?.textContent.includes('1')", 'guest merge acknowledged');
    await navigate('/cart'); await wait("document.querySelector('.cart-sheet-name')?.textContent.includes('P3 Browser Drink')", 'database cart reload');
    await click('.cart-edit'); await wait("document.querySelector('.add-bag')?.textContent.includes('Lưu thay đổi') && !document.querySelector('.add-bag').disabled", 'edit existing line');
    await evaluate("Array.from(document.querySelectorAll('.choice-row button')).find(e=>e.textContent.trim().startsWith('L ·')).click()");
    await fill('#quantity', '2'); await fill('#note', 'P3 edited'); await click('.add-bag'); await wait("location.pathname==='/cart' && document.body.innerText.includes('P3 edited')", 'edit persisted');
    await screenshot('cart-desktop', 1440, 1000, false); await screenshot('cart-mobile', 390, 844, true);
    await click('[aria-label="Xóa P3 Browser Drink"]'); await wait("document.querySelector('[aria-label=\"Xác nhận xóa món\"]')", 'remove confirmation');
    await evaluate("Array.from(document.querySelectorAll('dialog button')).find(e=>e.textContent.trim()==='Xóa món').click()");
    await wait("document.body.innerText.includes('Giỏ của bạn đang trống.')", 'delete persisted');
    await navigate('/login'); await wait("document.querySelector('#auth-email')", 'admin login'); await login(settings.admin);
    await navigate('/admin'); await wait("Array.from(document.querySelectorAll('nav button')).some(e=>e.textContent==='Size và tồn kho')", 'admin area');
    await evaluate("Array.from(document.querySelectorAll('nav button')).find(e=>e.textContent==='Size và tồn kho').click()");
    await wait("document.body.innerText.includes('Chưa nhập tồn kho') && document.querySelector('[aria-label=\"Tồn thực tế M\"]')", 'inventory table and NULL label');
    if (!await evaluate("document.querySelector('[aria-label=\"Tồn thực tế Uninitialized\"]').value===''")) throw new Error('Uninitialized stock input was invented');
    await fill('[aria-label="Tồn thực tế M"]', '55'); await evaluate("document.querySelector('[aria-label=\"Tồn thực tế M\"]').closest('form').requestSubmit()");
    await wait("Array.from(document.querySelectorAll('tbody tr')).some(r=>r.cells[0]?.textContent==='M' && r.textContent.includes('55'))", 'ADMIN inventory saved');
    await screenshot('inventory-mobile', 390, 844, true); await screenshot('inventory-desktop', 1440, 1000, false);
    if (errors.length) throw new Error('Browser runtime/hydration errors');
    console.log(JSON.stringify({ browserFlow: 'passed', realBackendRequests: requests, runtimeExceptions: 0 }));
    await call('Browser.close', {}, null);
  } finally { socket?.close(); if (processEdge.exitCode === null) processEdge.kill(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
