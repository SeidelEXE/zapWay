const BaileysManager = require('../../infra/baileys/baileys.manager')

/**
 * Servico de gerenciamento de sessoes do WhatsApp.
 */
class SessionService {
  constructor({ sessionSocket } = {}) {
    this.baileysManager = new BaileysManager()
    this.sessionSocket = sessionSocket || null
  }

  /**
   * Cria uma nova sessao do WhatsApp.
   * @param {Object} sessionData - Dados da sessao
   * @returns {Promise<Object>}
   */
  async createSession(sessionData) {
    const { sessionId } = sessionData || {}

    if (!sessionId) {
      throw new Error('ID da sessao e obrigatorio')
    }

    // Criar sessao com callbacks
    this.baileysManager.createSession(sessionId, {
      onQR: (qr, id) => {
        this.emitQRCode(id, qr)
      },
      onConnected: (id) => {
        this.updateSessionStatus(id, 'connected')
        this.emitSessionStatus(id, 'connected')
      },
      onDisconnected: (id, error) => {
        this.updateSessionStatus(id, 'disconnected')
        this.emitSessionStatus(id, 'disconnected')

        // Reconexao automatica fica no BaileysClient (infra)
        if (error) {
          // noop
        }
      },
      onMessage: (message, sid) => {
        this.handleIncomingMessage(message, sid)
      }
    })

    await this.baileysManager.connectSession(sessionId)
    await this.createSessionRecord(sessionData)

    return {
      success: true,
      sessionId,
      message: 'Sessao criada com sucesso'
    }
  }

  /**
   * Remove uma sessao existente.
   */
  async removeSession(sessionId) {
    const success = this.baileysManager.removeSession(sessionId)

    if (!success) {
      throw new Error(`Sessao ${sessionId} nao encontrada`)
    }

    await this.updateSessionStatus(sessionId, 'removed')

    return {
      success: true,
      sessionId,
      message: 'Sessao removida com sucesso'
    }
  }

  /**
   * Lista todas as sessoes ativas.
   */
  async listSessions() {
    const sessionIds = this.baileysManager.listSessions()
    const sessions = []

    for (const sessionId of sessionIds) {
      const sessionRecord = await this.getSessionRecord(sessionId)
      const isConnected = this.baileysManager.getSession(sessionId)?.isConnected() || false

      sessions.push({
        ...sessionRecord,
        isConnected,
        status: isConnected ? 'connected' : 'disconnected'
      })
    }

    return sessions
  }

  /**
   * Obtem informacoes de uma sessao especifica.
   */
  async getSession(sessionId) {
    const sessionRecord = await this.getSessionRecord(sessionId)
    const baileysSession = this.baileysManager.getSession(sessionId)
    const isConnected = baileysSession ? baileysSession.isConnected() : false

    return {
      ...sessionRecord,
      isConnected,
      status: isConnected ? 'connected' : 'disconnected'
    }
  }

  /**
   * Reconecta uma sessao manualmente.
   */
  async reconnectSession(sessionId) {
    const session = this.baileysManager.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessao ${sessionId} nao encontrada`)
    }

    if (!session.isConnected()) {
      await this.baileysManager.connectSession(sessionId)
    }
  }

  /**
   * Envia mensagem via uma sessao especifica.
   */
  async sendMessage(sessionId, number, content) {
    return this.baileysManager.sendMessage(sessionId, number, content)
  }

  async updateSessionStatus(sessionId, status) {
    // Implementacao sera feita no session.store.js
    console.log(`Atualizando status da sessao ${sessionId} para ${status}`)
  }

  emitQRCode(sessionId, qr) {
    if (this.sessionSocket && typeof this.sessionSocket.emitQRCode === 'function') {
      this.sessionSocket.emitQRCode(sessionId, qr)
      return
    }

    console.log(`QR Code para sessao ${sessionId}:`, qr)
  }

  emitSessionStatus(sessionId, status) {
    if (this.sessionSocket && typeof this.sessionSocket.emitSessionStatus === 'function') {
      this.sessionSocket.emitSessionStatus(sessionId, status)
      return
    }

    console.log(`Status da sessao ${sessionId}: ${status}`)
  }

  async handleIncomingMessage(message, sessionId) {
    await this.saveReceivedMessage(message, sessionId)

    if (this.sessionSocket && typeof this.sessionSocket.emitNewMessage === 'function') {
      this.sessionSocket.emitNewMessage(message, sessionId)
    }

    await this.processAutoReply(message, sessionId)
  }

  async processAutoReply(message, sessionId) {
    // Implementacao sera feita no rules.service.js e rules.engine.js
    console.log(`Processando regras para mensagem da sessao ${sessionId}`)
  }

  // Metodos placeholder para interacao com banco de dados

  async createSessionRecord(sessionData) {
    console.log('Criando registro de sessao:', sessionData)
  }

  async getSessionRecord(sessionId) {
    console.log('Buscando registro de sessao:', sessionId)
    return { id: sessionId, number: '', status: 'created' }
  }

  async saveReceivedMessage(message, sessionId) {
    console.log('Salvando mensagem recebida:', { message, sessionId })
  }
}

module.exports = SessionService
