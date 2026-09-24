import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer } from '../src/ws.ts'

describe('WebSocketServer', () => {
  it('accepts a client and sends a text frame', async () => {
    const server = http.createServer()
    const wss = new WebSocketServer(server)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const { port } = server.address() as AddressInfo
    const ws = new WebSocket(`ws://127.0.0.1:${port}`)
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => reject(new Error('socket failed')))
    })
    expect(wss.clients.size).toBe(1)
    const message = new Promise<string>((resolve) => {
      ws.addEventListener('message', (event) => resolve(String(event.data)))
    })
    for (const client of wss.clients) client.send('reload')
    expect(await message).toBe('reload')
    ws.close()
    server.close()
  })
})
