import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const url = process.argv[2] || 'http://localhost:3000/replayer/54e43847-2490-4751-9981-831bf7cf367c';
const outputPath = process.argv[3] || 'screenshot.png';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = path.resolve('tmp_edge_profile');

const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1920,1080',
  url,
]);

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const data = await res.json();
      const page = data.find((d) => d.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // wait
    }
    await wait(500);
  }
  throw new Error('Could not connect to Edge DevTools');
}

async function run() {
  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);

    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };

    await new Promise((res) => (ws.onopen = res));

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    console.log('Waiting for replayer telemetry to finish loading...');
    let loaded = false;
    for (let i = 0; i < 40; i++) {
      const evalLoading = await send('Runtime.evaluate', {
        expression: `(() => {
          const loadingEl = document.querySelector('[data-testid="replayer-loading-indicator"]');
          const canvas = document.querySelector('canvas');
          return {
            isLoading: Boolean(loadingEl),
            hasCanvas: Boolean(canvas),
            canvasWidth: canvas ? canvas.width : 0
          };
        })()`,
        returnByValue: true,
      });

      const res = evalLoading.result?.value;
      if (res && !res.isLoading && res.hasCanvas) {
        console.log('Loaded successfully! Canvas detected:', res);
        loaded = true;
        break;
      }
      await wait(1000);
    }

    // Wait an extra 2 seconds for canvas to settle
    await wait(2000);

    // Inspect DOM
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const hud = document.querySelector('div.absolute.inset-x-0.bottom-0');
        const sidebar = document.querySelector('aside');
        const canvas = document.querySelector('canvas');
        const rosterRows = Array.from(document.querySelectorAll('[data-testid^="roster-player-"]')).map(el => ({
          id: el.getAttribute('data-testid'),
          text: el.innerText.replace(/\\n/g, ' | ')
        }));
        return {
          hasBottomHUD: Boolean(hud),
          bottomHUDText: hud ? hud.innerText.slice(0, 300) : null,
          hasSidebar: Boolean(sidebar),
          rosterRowsCount: rosterRows.length,
          rosterSample: rosterRows.slice(0, 4),
          hasCanvas: Boolean(canvas),
          canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null
        };
      })()`,
      returnByValue: true,
    });

    console.log('DOM Inspection:', JSON.stringify(evalRes.result?.value, null, 2));

    // Capture screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot.result?.data) {
      fs.writeFileSync(outputPath, Buffer.from(shot.result.data, 'base64'));
      console.log('Screenshot saved to:', outputPath);
    }

    ws.close();
  } finally {
    proc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error(err);
  proc.kill();
  process.exit(1);
});
