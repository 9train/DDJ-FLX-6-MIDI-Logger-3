#!/usr/bin/env node
// Simple WebSocket broadcast bridge
import { WebSocketServer } from 'ws';

const port = Number(process.argv[2] || 8787);
const wss = new WebSocketServer({ port });

wss.on('connection', ws => {
  ws.on('message', data => {
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString());
      }
    }
  });
});

console.log(`ws-bridge listening on ${port}`);
