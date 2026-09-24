import crypto from 'node:crypto'
import type { Server } from 'node:http'
import type { Duplex } from 'node:stream'

/**
 * Minimal WebSocket server (RFC 6455) — no external deps.
 */
export class WebSocketServer {
  clients = new Set<WebSocketClient>()

  constructor(server: Server) {
    this.clients = new Set()
    server.on('upgrade', (req, socket, head) => {
      if ((req.headers.upgrade || '').toLowerCase() !== 'websocket') {
        socket.destroy()
        return
      }
      const key = req.headers['sec-websocket-key']
      if (!key || Array.isArray(key)) {
        socket.destroy()
        return
      }
      const accept = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64')

      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${accept}\r\n` +
          '\r\n',
      )

      const client = new WebSocketClient(socket)
      this.clients.add(client)
      client.on('close', () => this.clients.delete(client))

      if (head?.length) client._feed(head)
    })
  }
}

class WebSocketClient {
  socket: Duplex
  readyState: number
  _buffer: Buffer
  _listeners: { close: Array<(data?: string) => void>; message: Array<(data?: string) => void> }

  constructor(socket: Duplex) {
    this.socket = socket
    this.readyState = 1 // OPEN
    this._buffer = Buffer.alloc(0)
    this._listeners = { close: [], message: [] }

    socket.on('data', (chunk) => this._feed(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    socket.on('close', () => this._close())
    socket.on('error', () => this._close())
  }

  on(event: 'close' | 'message', fn: (data?: string) => void) {
    ;(this._listeners[event] ||= []).push(fn)
  }

  send(data: string) {
    if (this.readyState !== 1) return
    const payload = Buffer.from(String(data))
    const len = payload.length
    let header
    if (len < 126) {
      header = Buffer.from([0x81, len])
    } else if (len < 65536) {
      header = Buffer.alloc(4)
      header[0] = 0x81
      header[1] = 126
      header.writeUInt16BE(len, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x81
      header[1] = 127
      header.writeBigUInt64BE(BigInt(len), 2)
    }
    this.socket.write(Buffer.concat([header, payload]))
  }

  _emit(event: 'close' | 'message', ...args: [string?]) {
    for (const fn of this._listeners[event] || []) fn(...args)
  }

  _close() {
    if (this.readyState === 3) return
    this.readyState = 3
    this._emit('close')
    try {
      this.socket.destroy()
    } catch {
      /* ignore */
    }
  }

  _feed(chunk: Buffer) {
    this._buffer = Buffer.concat([this._buffer, chunk])
    while (this._buffer.length >= 2) {
      const first = this._buffer[0]
      const second = this._buffer[1]
      const opcode = first & 0x0f
      const masked = (second & 0x80) !== 0
      let len = second & 0x7f
      let offset = 2

      if (len === 126) {
        if (this._buffer.length < 4) return
        len = this._buffer.readUInt16BE(2)
        offset = 4
      } else if (len === 127) {
        if (this._buffer.length < 10) return
        len = Number(this._buffer.readBigUInt64BE(2))
        offset = 10
      }

      const maskLen = masked ? 4 : 0
      const total = offset + maskLen + len
      if (this._buffer.length < total) return

      let payload = this._buffer.subarray(offset + maskLen, total)
      if (masked) {
        const mask = this._buffer.subarray(offset, offset + 4)
        payload = Buffer.from(payload)
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4]
      }

      this._buffer = this._buffer.subarray(total)

      if (opcode === 0x8) {
        this._close()
        return
      }
      if (opcode === 0x9) {
        const pong = Buffer.alloc(2 + payload.length)
        pong[0] = 0x8a
        pong[1] = payload.length
        payload.copy(pong, 2)
        this.socket.write(pong)
        continue
      }
      if (opcode === 0x1) {
        this._emit('message', payload.toString('utf8'))
      }
    }
  }
}
