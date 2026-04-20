const path = require('path')
const pino = require('pino')
const createJsonAuthState = require('./json-auth-state')

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore
} = require('@whiskeysockets/baileys')

/**
 * Cliente Baileys para gerenciar uma sessao do WhatsApp.
 */
class BaileysClient {
  /**
   * @param {string} sessionId - ID unico da sessao
   * @param {Object} callbacks - Funcoes de callback para eventos
   * @param {(qr: string, sessionId: string) => void} [callbacks.onQR]
   * @param {(sessionId: string) => void} [callbacks.onConnected]
   * @param {(sessionId: string, error?: any) => void} [callbacks.onDisconnected]
   * @param {(message: any, sessionId: string) => void} [callbacks.onMessage]
   * @param {(error: any) => void} [callbacks.onError]
   */
  constructor(sessionId, callbacks = {}) {
    this.sessionId = sessionId
    this.authFile = path.join(process.cwd(), 'config', 'terminal-session.json')

    this.logger = pino({ level: 'silent' })
    this.store = typeof makeInMemoryStore === 'function'
      ? makeInMemoryStore({ logger: this.logger })
      : null

    this.socket = null
    this.connected = false
    this._connecting = false
    this.shouldReconnect = true
    this._reconnectTimer = null
    this.reconnectAttempts = 0
    this.baseReconnectDelayMs = 1000
    this.maxReconnectDelayMs = 30000

    this.callbacks = {
      onQR: callbacks.onQR || (() => {}),
      onConnected: callbacks.onConnected || (() => {}),
      onDisconnected: callbacks.onDisconnected || (() => {}),
      onMessage: callbacks.onMessage || (() => {}),
      onError: callbacks.onError || (() => {})
    }
  }

  /**
   * Inicializa a conexao com WhatsApp.
   */
  async connect() {
    if (this._connecting) return
    this._connecting = true
    this.shouldReconnect = true

    try {
      const authState = createJsonAuthState(this.authFile)
      const { state, saveCreds } = authState

      let version
      try {
        const v = await fetchLatestBaileysVersion()
        version = v.version
      } catch {
        version = undefined
      }

      this.socket = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: state,
        logger: this.logger,
        browser: ['UnifiZap', 'Chrome', '']
      })

      if (this.store?.bind) {
        this.store.bind(this.socket.ev)
      }

      this.socket.ev.on('creds.update', saveCreds)
      this.socket.ev.on('connection.update', (update) => this.handleConnectionUpdate(update))
      this.socket.ev.on('messages.upsert', (m) => this.handleMessageUpsert(m))
    } catch (e) {
      this.callbacks.onError(e)
      throw e
    } finally {
      this._connecting = false
    }
  }

  /**
   * @param {any} update - Atualizacao de conexao do Baileys
   */
  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update || {}

    if (qr) {
      this.callbacks.onQR(qr, this.sessionId)
    }

    if (connection === 'open') {
      this.connected = true
      this.reconnectAttempts = 0
      this.callbacks.onConnected(this.sessionId)
      return
    }

    if (connection === 'close') {
      this.connected = false
      this.socket = null

      const error = lastDisconnect?.error
      const statusCode = error?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut

      this.callbacks.onDisconnected(this.sessionId, error)

      // Quando o WhatsApp invalida a sessao (loggedOut), removemos auth antiga
      // para forcar novo QR na proxima tentativa.
      if (isLoggedOut) {
        console.log(`[${this.sessionId}] Sessao invalidada/deslogada. Preparando novo pareamento por QR Code...`)
        this.clearAuthState()
      }

      // Reconecta automaticamente enquanto nao for uma desconexao intencional.
      if (this.shouldReconnect) {
        if (this._reconnectTimer) {
          clearTimeout(this._reconnectTimer)
        }
        const delayMs = this.getReconnectDelayMs()
        console.log(`[${this.sessionId}] Tentando reconectar em ${delayMs}ms...`)
        this._reconnectTimer = setTimeout(() => {
          this._reconnectTimer = null
          this.connect().catch(this.callbacks.onError)
        }, delayMs)
      }
    }
  }

  getReconnectDelayMs() {
    const attempt = this.reconnectAttempts
    this.reconnectAttempts += 1

    const exp = this.baseReconnectDelayMs * (2 ** attempt)
    const capped = Math.min(this.maxReconnectDelayMs, exp)
    const jitter = 0.85 + Math.random() * 0.3
    return Math.round(capped * jitter)
  }

  clearAuthState() {
    try {
      const authState = createJsonAuthState(this.authFile)
      authState.clear()
    } catch (e) {
      this.callbacks.onError(e)
    }
  }

  /**
   * Manipula recebimento de mensagens.
   * @param {any} upsert
   */
  handleMessageUpsert(upsert) {
    const messages = upsert?.messages || []
    for (const message of messages) {
      if (!message) continue

      // Apenas mensagens recebidas
      if (message.key?.fromMe) continue

      this.callbacks.onMessage(
        {
          key: message.key,
          message: message.message,
          pushName: message.pushName,
          timestamp: message.messageTimestamp
        },
        this.sessionId
      )
    }
  }

  /**
   * Envia uma mensagem.
   * @param {string} number - Numero do destinatario (formato internacional)
   * @param {string|Object} content - Conteudo da mensagem
   */
  async sendMessage(number, content) {
    if (!this.socket || !this.connected) {
      throw new Error('Cliente nao conectado')
    }

    const formattedNumber = number.includes('@')
      ? number
      : `${number.replace(/[^\d]/g, '')}@s.whatsapp.net`

    return this.socket.sendMessage(formattedNumber, content)
  }

  async sendPresenceUpdate(presence, jid) {
    if (!this.socket || !this.connected) {
      throw new Error('Cliente nao conectado')
    }
    return this.socket.sendPresenceUpdate(presence, jid)
  }

  /**
   * Desconecta o cliente.
   */
  async disconnect() {
    if (!this.socket) return

    this.shouldReconnect = false
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }

    try {
      if (typeof this.socket.end === 'function') {
        this.socket.end()
      } else if (this.socket.ws && typeof this.socket.ws.close === 'function') {
        this.socket.ws.close()
      }
    } catch (e) {
      this.callbacks.onError(e)
    } finally {
      this.socket = null
      this.connected = false
    }
  }

  /**
   * @returns {boolean}
   */
  isConnected() {
    return !!this.socket && this.connected === true
  }
}

module.exports = BaileysClient
