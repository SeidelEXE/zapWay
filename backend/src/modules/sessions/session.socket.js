/**
 * WebSocket (Fastify) para sessoes.
 * Protocolo simples por JSON:
 * Cliente -> { "event": "get-sessions", "data": {} }
 * Server  -> { "event": "sessions-list", "data": [...] }
 */
class SessionSocket {
  /**
   * @param {import('fastify').FastifyInstance} fastify - Instancia do Fastify (com @fastify/websocket registrado)
   * @param {any} sessionService - Instancia do servico de sessoes
   * @param {Object} [options]
   * @param {string} [options.path] - Path do WS
   */
  constructor(fastify, sessionService, options = {}) {
    this.fastify = fastify
    this.sessionService = sessionService
    this.path = options.path || '/ws/sessions'
    this.clients = new Set()

    this.registerRoutes()
  }

  /**
   * Registra rota websocket no Fastify.
   */
  registerRoutes() {
    this.fastify.get(this.path, { websocket: true }, (connection) => {
      const socket = connection.socket
      this.clients.add(socket)
      this.fastify.log?.info?.({ ws: this.path }, 'ws connected')

      socket.on('message', async (raw) => {
        await this.handleIncoming(socket, raw)
      })

      socket.on('close', () => {
        this.clients.delete(socket)
        this.fastify.log?.info?.({ ws: this.path }, 'ws disconnected')
      })
    })
  }

  /**
   * Envia evento para um socket especifico.
   * @param {any} socket
   * @param {string} event
   * @param {any} data
   */
  send(socket, event, data) {
    try {
      socket.send(JSON.stringify({ event, data }))
    } catch {
      // Ignora erros de socket fechado
    }
  }

  /**
   * Broadcast para todos os clientes conectados.
   * @param {string} event
   * @param {any} data
   */
  broadcast(event, data) {
    for (const socket of this.clients) {
      if (socket.readyState === 1) {
        this.send(socket, event, data)
      }
    }
  }

  /**
   * Processa mensagens recebidas do cliente.
   * @private
   */
  async handleIncoming(socket, raw) {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      this.send(socket, 'error', { message: 'invalid_json' })
      return
    }

    const { event, data } = msg || {}

    try {
      if (event === 'get-sessions') {
        const sessions = await this.sessionService.listSessions()
        this.send(socket, 'sessions-list', sessions)
        return
      }

      if (event === 'create-session') {
        const result = await this.sessionService.createSession(data || {})
        this.broadcast('session-created', result)
        this.send(socket, 'create-session-response', result)
        return
      }

      if (event === 'remove-session') {
        const result = await this.sessionService.removeSession(data?.sessionId || data)
        this.broadcast('session-removed', { sessionId: result.sessionId })
        this.send(socket, 'remove-session-response', result)
        return
      }

      if (event === 'send-message') {
        const { sessionId, number, content } = data || {}
        const result = await this.sessionService.sendMessage(sessionId, number, content)
        this.send(socket, 'send-message-response', result)
        return
      }

      this.send(socket, 'error', { message: 'unknown_event', event })
    } catch (error) {
      this.send(socket, 'error', { message: error?.message || 'internal_error', event })
    }
  }

  emitQRCode(sessionId, qr) {
    this.broadcast('qr-code', { sessionId, qr })
  }

  emitSessionStatus(sessionId, status) {
    this.broadcast('session-status', { sessionId, status })
  }

  emitNewMessage(message, sessionId) {
    this.broadcast('new-message', { message, sessionId })
  }

  emitMessageLog(log) {
    this.broadcast('message-log', log)
  }
}

module.exports = SessionSocket
