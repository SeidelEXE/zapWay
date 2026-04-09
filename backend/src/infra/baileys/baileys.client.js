const { makeInMemoryStore } = require('@adiwajshing/baileys')
const { useMultiFileAuthState } = require('@adiwajshing/baileys')
const pino = require('pino')

/**
 * Cliente Baileys para gerenciar uma sessão do WhatsApp
 */
class BaileysClient {
  /**
   * @param {string} sessionId - ID único da sessão
   * @param {Object} callbacks - Funções de callback para eventos
   * @param {Function} callbacks.onQR - Callback quando QR Code é gerado
   * @param {Function} callbacks.onConnected - Callback quando conectado
   * @param {Function} callbacks.onDisconnected - Callback quando desconectado
   * @param {Function} callbacks.onMessage - Callback quando mensagem é recebida
   */
  constructor(sessionId, callbacks = {}) {
    this.sessionId = sessionId
    this.state = useMultiFileAuthState(`./sessions/${sessionId}`)
    this.store = makeInMemoryStore({})
    this.socket = null
    this.callbacks = {
      onQR: callbacks.onQR || (() => {}),
      onConnected: callbacks.onConnected || (() => {}),
      onDisconnected: callbacks.onDisconnected || (() => {}),
      onMessage: callbacks.onMessage || (() => {}),
      onError: callbacks.onError || (() => {})
    }

    // Salvar credenciais sempre que alteradas
    this.state.saveCreds.bind(this.state)
  }

  /**
   * Inicializa a conexão com WhatsApp
   */
  async connect() {
    const { saveCreds } = this.state

    this.socket = require('@adiwajshing/baileys').default({
      printQRInTerminal: false,
      auth: {
        creds: this.state.creds,
        keys: this.state.keys
      },
      logger: pino({ level: 'silent' }),
      browser: ['UnifiZap', 'Chrome', '']
    })

    this.socket.ev.on('creds.update', saveCreds)
    this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this))
    this.socket.ev.on('messages.upsert', this.handleMessageUpsert.bind(this))

    await this.store.sync(this.socket)
  }

  /**
   * Manipula atualizações de conexão
   * @param {Object} update - Atualização de conexão do Baileys
   */
  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      this.callbacks.onQR(qr, this.sessionId)
    }

    if (connection === 'open') {
      this.callbacks.onConnected(this.sessionId)
    }

    if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
      this.callbacks.onDisconnected(this.sessionId, lastDisconnect.error)
      // Tentar reconectar após erro não autorizado
      setTimeout(() => this.connect(), 5000)
    }
  }

  /**
   * Manipula recebimento de mensagens
   * @param {Object} mensagem - Objeto de mensagem do Baileys
   */
  handleMessageUpsert(mensagem) {
    const message = mensagem.messages[0]
    if (!message.key.fromMe) { // Apenas mensagens recebidas
      this.callbacks.onMessage({
        key: message.key,
        message: message.message,
        pushName: message.pushName,
        timestamp: message.messageTimestamp
      }, this.sessionId)
    }
  }

  /**
   * Envia uma mensagem
   * @param {string} number - Número do destinatário (formato internacional)
   * @param {string|Object} content - Conteúdo da mensagem
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendMessage(number, content) {
    if (!this.socket || this.socket.ws?.readyState !== 3) {
      throw new Error('Cliente não conectado')
    }

    const formattedNumber = number.endsWith('@s.whatsapp.net')
      ? number
      : `${number.replace(/[^\d]/g, '')}@s.whatsapp.net`

    return this.socket.sendMessage(formattedNumber, content)
  }

  /**
   * Desconecta o cliente
   */
  async disconnect() {
    if (this.socket) {
      await this.socket.destroy()
      this.socket = null
    }
  }

  /**
   * Verifica se o cliente está conectado
   * @returns {boolean} Status de conexão
   */
  isConnected() {
    return this.socket && this.socket.ws?.readyState === 3
  }
}

module.exports = BaileysClient