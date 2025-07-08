const ws = require('ws');
const fs = require('fs');

const args = process.argv.slice(2)
const filePath = args[0];
const port = Number(args[1])

if (Number.isInteger(port)) {
  const wss = new ws.WebSocketServer({ port })

  function broadcast(data) {
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  }

  wss.on('connection', (wss) => {
    const content = fs.readFileSync(filePath, 'utf-8')
    broadcast(JSON.stringify({ type: 'update', content }))

    fs.watchFile(filePath, { interval: 500 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        const content = fs.readFileSync(filePath, 'utf-8')
        broadcast(JSON.stringify({ type: 'update', content }))
      }
    })

  });

  // eslint-disable-next-line no-console
  console.log(`    WebSocket server is up at port ${port}`)
}
