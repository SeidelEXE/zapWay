const path = require('path')
const pino = require('pino')

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  useMultiFileAuthState
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
    this.authDir = path.join(process.cwd(), 'sessions', sessionId)

    this.logger = pino({ level: 'silent' })
    this.store = makeInMemoryStore({ logger: this.logger })

    this.socket = null
    this.connected = false
    this._connecting = false
    this.shouldReconnect = true

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
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir)

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

      this.store.bind(this.socket.ev)

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
      this.callbacks.onConnected(this.sessionId)
      return
    }

    if (connection === 'close') {
      this.connected = false

      const error = lastDisconnect?.error
      const statusCode = error?.output?.statusCode

      this.callbacks.onDisconnected(this.sessionId, error)

      // Nao reconectar automaticamente se tiver feito logout ou se a desconexao foi intencional.
      if (this.shouldReconnect && statusCode !== DisconnectReason.loggedOut) {
        setTimeout(() => {
          this.connect().catch(this.callbacks.onError)
        }, 5000)
      }
    }
  }

  /**
   * Manipula recebimento de mensagens.
   * @param {any} upsert
   */
  handleMessageUpsert(upsert) {
    const message = upsert?.messages?.[0]
    if (!message) return

    // Apenas mensagens recebidas
    if (message.key?.fromMe) return

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

  /**
   * Envia uma mensagem.
   * @param {string} number - Numero do destinatario (formato internacional)
   * @param {string|Object} content - Conteudo da mensagem
   */
  async sendMessage(number, content) {
    if (!this.socket || !this.connected) {
      throw new Error('Cliente nao conectado')
    }

    const formattedNumber = number.endsWith('@s.whatsapp.net')
      ? number
      : `${number.replace(/[^\d]/g, '')}@s.whatsapp.net`

    return this.socket.sendMessage(formattedNumber, content)
  }

  /**
   * Desconecta o cliente.
   */
  async disconnect() {
    if (!this.socket) return

    this.shouldReconnect = false

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
