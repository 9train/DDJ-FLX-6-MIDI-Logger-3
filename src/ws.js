// src/ws.js
// Connects to the Node WebSocket and forwards each "midi_like" payload to:
//   1) your visual handler (onInfo)
//   2) console tools: FLX_LEARN_HOOK / FLX_MONITOR_HOOK
//
// Usage (old / positional, still supported):
//   import { connectWS } from './ws.js';
//   connectWS('ws://localhost:8787', info => consumeInfo(info), s => setStatus(s));
//
// Usage (new / role-aware object):
//   connectWS({ url: 'ws://localhost:8787', role: 'viewer', onInfo: consumeInfo, onStatus: setStatus });

export function connectWS(urlOrOpts = 'ws://localhost:8787', onInfoPos = () => {}, onStatusPos = () => {}) {
  // Backward-compat: accept either (url, onInfo, onStatus) or ({ url, role, onInfo, onStatus })
  const opts = (typeof urlOrOpts === 'string')
    ? { url: urlOrOpts, onInfo: onInfoPos, onStatus: onStatusPos }
    : (urlOrOpts || {});

  const {
    url = 'ws://localhost:8787',
    role = 'viewer',          // 'viewer' | 'host'
    onInfo = () => {},
    onStatus = () => {}
  } = opts;

  let ws;
  let retryMs = 1200;
  let alive = false;
  let pingTimer = null;
  let shouldReconnect = true; // Patch 2: allow caller to stop auto-reconnect

  function setStatus(s) {
    try { onStatus(s); } catch {}
  }

  function heartbeat() {
    if (pingTimer) clearTimeout(pingTimer);
    // consider the socket dead if no pong within ~10s
    pingTimer = setTimeout(() => {
      try { ws?.close(); } catch {}
    }, 10000);
  }

  // Patch 1: if we're the host, allow sending midi_like to the server
  function send(info) {
    if (role !== 'host') return;
    try { ws?.send(JSON.stringify({ type: 'midi_like', payload: info })); } catch {}
  }

  function open() {
    setStatus('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
      alive = true;
      setStatus('connected');
      heartbeat();
      // Say hello with role info
      try { ws.send(JSON.stringify({ type: 'hello', role })); } catch {}
    };

    ws.onmessage = (e) => {
      heartbeat();
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      // Normalize a midi-like payload shape
      if (msg?.type === 'midi_like' && msg.payload) {
        const info = normalizeInfo(msg.payload);
        // 1) visuals
        try { onInfo(info); } catch {}
        // 2) console tools
        try { window.FLX_LEARN_HOOK?.(info); } catch {}
        try { window.FLX_MONITOR_HOOK?.(info); } catch {}
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => {
      alive = false;
      setStatus('closed');
      if (pingTimer) clearTimeout(pingTimer);
      // Patch 2: simple backoff unless caller explicitly closed
      if (shouldReconnect) {
        setTimeout(open, retryMs);
        retryMs = Math.min(retryMs * 1.5, 6000);
      }
    };
  }

  open();

  return {
    // Only does anything when role === 'host'
    send,
    close() {
      shouldReconnect = false; // Patch 2: stop reconnecting once caller closes
      try { ws?.close(); } catch {}
    },
    isAlive() { return alive; }
  };
}

function normalizeInfo(p) {
  // Ensure consistent keys for downstream code
  const type = (p.type || '').toLowerCase(); // 'noteon' | 'noteoff' | 'cc' | 'pitch'
  const ch   = Number(p.ch ?? p.channel ?? 1);
  // code is 'note' for notes, 'controller' for CC; normalize d1/d2 too
  const controller = p.controller ?? p.ctrl ?? p.d1;
  const note       = p.note ?? p.d1;
  const value      = p.value ?? p.velocity ?? p.d2 ?? 0;

  if (type === 'cc') {
    return { type, ch, controller: Number(controller), value: Number(value), d1: Number(controller), d2: Number(value) };
  }
  if (type === 'noteon' || type === 'noteoff') {
    return { type, ch, d1: Number(note), d2: Number(value), value: Number(value) };
  }
  if (type === 'pitch') {
    return { type, ch, value: Number(value) };
  }
  // fallback pass-through (but lowercased type and numeric ch)
  return { ...p, type, ch };
}
