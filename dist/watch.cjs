'use strict';

const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const OPEN = 1;
const WATCH_INTERVAL_MS = 500;
const BROADCAST_DEBOUNCE_MS = 100;

function createMessage(type, fields = {}) {
  return JSON.stringify({ type, ...fields });
}

function watch(filePath, portNumber) {
  const resolvedPath = path.resolve(String(filePath || ''));
  const port = Number.parseInt(portNumber, 10);

  if (!filePath) {
    throw new TypeError('A file path is required.');
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('A valid port number is required.');
  }

  const wss = new WebSocketServer({ port });
  let debounceTimer = null;

  function readCurrentMessage() {
    try {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      return createMessage('update', { content });
    } catch (err) {
      return createMessage('error', {
        message: `Unable to read "${resolvedPath}": ${err.message}`
      });
    }
  }

  function send(ws, message) {
    if (ws.readyState === OPEN) {
      ws.send(message);
    }
  }

  function broadcast(message) {
    for (const client of wss.clients) {
      if (client.readyState === OPEN) {
        client.send(message);
      }
    }
  }

  function broadcastCurrentFile() {
    broadcast(readCurrentMessage());
  }

  function scheduleBroadcast() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(broadcastCurrentFile, BROADCAST_DEBOUNCE_MS);
  }

  wss.on('connection', (socket) => {
    send(socket, readCurrentMessage());
  });

  wss.on('listening', () => {
    // eslint-disable-next-line no-console
    console.log(`Hurmet watch server listening at ws://localhost:${port}`);
  });

  wss.on('close', () => {
    clearTimeout(debounceTimer);
    fs.unwatchFile(resolvedPath, onFileChange);
  });

  wss.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error(`Watch server error: ${err.message}`);
  });

  function onFileChange(curr, prev) {
    if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
      scheduleBroadcast();
    }
  }

  fs.watchFile(resolvedPath, { interval: WATCH_INTERVAL_MS }, onFileChange);

  return {
    filePath: resolvedPath,
    port,
    server: wss,
    close() {
      clearTimeout(debounceTimer);
      fs.unwatchFile(resolvedPath, onFileChange);
      wss.close();
    }
  };
}

module.exports = watch;

if (require.main === module) {
  const [, , filePath, portNumber] = process.argv;
  watch(filePath, portNumber);
}
