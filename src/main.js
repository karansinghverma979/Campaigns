import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

function showErrorOverlay(errorMsg, stack) {
  const errContainer = document.createElement('div');
  errContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#090c15;color:#fca5a5;padding:32px;font-family:monospace;overflow:auto;display:flex;flex-direction:column;gap:16px;';
  errContainer.innerHTML = `
    <h2 style="color:#ef4444;margin:0;font-size:18px;">TACTICAL RUNTIME ERROR DETECTED</h2>
    <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);padding:16px;border-radius:12px;font-size:13px;line-height:1.5;">
      <strong>${errorMsg}</strong>
    </div>
    <pre style="background:#04060b;padding:16px;border-radius:12px;color:#cbd5e1;font-size:11px;overflow-x:auto;">${stack || 'No stack trace available'}</pre>
  `;
  document.body.appendChild(errContainer);
}

window.addEventListener('error', (e) => {
  console.error('Global Error:', e.error || e.message);
  showErrorOverlay(e.message, e.error?.stack);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled Rejection:', e.reason);
  showErrorOverlay(e.reason?.message || String(e.reason), e.reason?.stack);
});

let app;
try {
  app = mount(App, {
    target: document.getElementById('app'),
  });
} catch (err) {
  showErrorOverlay(err.message, err.stack);
}

export default app;
