const BaileysClient = require('./baileys.client')
const path = require('path')
const fs = require('fs')

/**
 * Gerenciador de múltiplas sessões Baileys
 */
class BaileysManager {
  constructor() {
    this.sessions = new Map()

    // Garantir que o diretório de sessões existe
    const sessionsDir = path.join(process.cwd(), 'sessions')
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true })
    }
  }

  /**
   * Cria uma nova sessão
   * @param {string} sessionId - ID único da sessão
   * @param {Object} callbacks - Callbacks para eventos da sessão
   * @returns {BaileysClient} Instância do cliente Baileys
   */
  createSession(sessionId, callbacks = {}) {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Sessão ${sessionId} já existe`)
    }

    const client = new BaileysClient(sessionId, callbacks)
    this.sessions.set(sessionId, client)
    return client
  }

  /**
   * Obtém uma sessão existente
   * @param {string} sessionId - ID da sessão
   * @returns {BaileysClient|null} Cliente Baileys ou null se não existir
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null
  }

  /**
   * Remove uma sessão
   * @param {string} sessionId - ID da sessão
   * @returns {boolean} True se removida com sucesso
   */
  removeSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.disconnect()
      this.sessions.delete(sessionId)
      return true
    }
    return false
  }

  /**
   * Lista todas as sessões ativas
   * @returns {Array} Array de IDs das sessões
   */
  listSessions() {
    return Array.from(this.sessions.keys())
  }

  /**
   * Verifica se uma sessão existe
   * @param {string} sessionId - ID da sessão
   * @returns {boolean} True se existe
   */
  hasSession(sessionId) {
    return this.sessions.has(sessionId)
  }

  /**
   * Conecta uma sessão
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<void>}
   */
  async connectSession(sessionId) {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    await session.connect()
  }

  /**
   * Desconecta uma sessão
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<void>}
   */
  async disconnectSession(sessionId) {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    await session.disconnect()
  }

  /**
   * Envia mensagem via uma sessão específica
   * @param {string} sessionId - ID da sessão
   * @param {string} number - Número do destinatário
   * @param {string|Object} content - Conteúdo da mensagem
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendMessage(sessionId, number, content) {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    if (!session.isConnected()) {
      throw new Error(`Sessão ${sessionId} não está conectada`)
    }

    return session.sendMessage(number, content)
  }

  /**
   * Obtém status de todas as sessões
   * @returns {Array} Array de objetos com informações de status
   */
  getSessionsStatus() {
    return Array.from(this.sessions.entries()).map(([sessionId, client]) => ({
      sessionId,
      isConnected: client.isConnected()
    }))
  }
}

module.exports = BaileysManager