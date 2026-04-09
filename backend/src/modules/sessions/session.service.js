const BaileysManager = require('../../infra/baileys/baileys.manager')

/**
 * Serviço de gerenciamento de sessões do WhatsApp
 */
class SessionService {
  constructor() {
    this.baileysManager = new BaileysManager()
  }

  /**
   * Cria uma nova sessão do WhatsApp
   * @param {Object} sessionData - Dados da sessão (id, etc.)
   * @returns {Promise<Object>} Resultado da criação
   */
  async createSession(sessionData) {
    const { sessionId } = sessionData

    if (!sessionId) {
      throw new Error('ID da sessão é obrigatório')
    }

    // Criar sessão com callbacks
    const client = this.baileysManager.createSession(sessionId, {
      onQR: (qr, id) => {
        // Emitir evento QR para o frontend via WebSocket
        this.emitQRCode(id, qr)
      },
      onConnected: (id) => {
        // Atualizar status da sessão no banco
        this.updateSessionStatus(id, 'connected')
        this.emitSessionStatus(id, 'connected')
      },
      onDisconnected: (id, error) => {
        // Atualizar status da sessão no banco
        this.updateSessionStatus(id, 'disconnected')
        this.emitSessionStatus(id, 'disconnected')

        // Tentar reconectar automaticamente após 5 segundos (exceto se for logout)
        if (error && error.output?.statusCode !== 401) {
          setTimeout(() => {
            this.reconnectSession(id).catch(console.error)
          }, 5000)
        }
      },
      onMessage: (message, sessionId) => {
        // Processar mensagem recebida
        this.handleIncomingMessage(message, sessionId)
      }
    })

    // Iniciar conexão
    await this.baileysManager.connectSession(sessionId)

    // Salvar informações da sessão no banco
    await this.createSessionRecord(sessionData)

    return {
      success: true,
      sessionId,
      message: 'Sessão criada com sucesso'
    }
  }

  /**
   * Remove uma sessão existente
   * @param {string} sessionId - ID da sessão a ser removida
   * @returns {Promise<Object>} Resultado da remoção
   */
  async removeSession(sessionId) {
    const success = this.baileysManager.removeSession(sessionId)

    if (!success) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    // Atualizar status no banco
    await this.updateSessionStatus(sessionId, 'removed')

    return {
      success: true,
      sessionId,
      message: 'Sessão removida com sucesso'
    }
  }

  /**
   * Lista todas as sessões ativas
   * @returns {Promise<Array>} Lista de sessões
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
   * Obtém informações de uma sessão específica
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<Object>} Dados da sessão
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
   * Reconecta uma sessão
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<void>}
   */
  async reconnectSession(sessionId) {
    const session = this.baileysManager.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    if (!session.isConnected()) {
      await this.baileysManager.connectSession(sessionId)
    }
  }

  /**
   * Envia mensagem via uma sessão específica
   * @param {string} sessionId - ID da sessão
   * @param {string} number - Número do destinatário
   * @param {string|Object} content - Conteúdo da mensagem
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendMessage(sessionId, number, content) {
    return this.baileysManager.sendMessage(sessionId, number, content)
  }

  /**
   * Atualiza status da sessão no banco de dados
   * @private
   * @param {string} sessionId - ID da sessão
   * @param {string} status - Novo status
   */
  async updateSessionStatus(sessionId, status) {
    // Implementação será feita no session.store.js
    // Por enquanto, apenas placeholder
    console.log(`Atualizando status da sessão ${sessionId} para ${status}`)
  }

  /**
   * Emite evento de QR Code via WebSocket
   * @private
   * @param {string} sessionId - ID da sessão
   * @param {string} qr - Código QR
   */
  emitQRCode(sessionId, qr) {
    // Implementação será feita no session.socket.js
    console.log(`QR Code para sessão ${sessionId}:`, qr)
  }

  /**
   * Emite evento de status via WebSocket
   * @private
   * @param {string} sessionId - ID da sessão
   * @param {string} status - Novo status
   */
  emitSessionStatus(sessionId, status) {
    // Implementação será feita no session.socket.js
    console.log(`Status da sessão ${sessionId}: ${status}`)
  }

  /**
   * Processa mensagem recebida
   * @private
   * @param {Object} message - Mensagem recebida
   * @param {string} sessionId - ID da sessão
   */
  async handleIncomingMessage(message, sessionId) {
    // Salvar mensagem no banco
    await this.saveReceivedMessage(message, sessionId)

    // Verificar regras automáticas
    await this.processAutoReply(message, sessionId)
  }

  /**
   * Salva mensagem recebida no banco de dados
   * @private
   * @param {Object} message - Mensagem recebida
   * @param {string} sessionId - ID da sessão
   */
  async saveReceivedMessage(message, sessionId) {
    // Implementação será feita no message.service.js
    console.log(`Salvando mensagem recebida da sessão ${sessionId}`)
  }

  /**
   * Processa resposta automática baseado em regras
   * @private
   * @param {Object} message - Mensagem recebida
   * @param {string} sessionId - ID da sessão
   */
  async processAutoReply(message, sessionId) {
    // Implementação será feita no rules.service.js e rules.engine.js
    console.log(`Processando regras para mensagem da sessão ${sessionId}`)
  }

  // Métodos placeholder para interação com banco de dados
  // Serão implementados nos store.js correspondentes

  async createSessionRecord(sessionData) {
    console.log('Criando registro de sessão:', sessionData)
  }

  async getSessionRecord(sessionId) {
    console.log('Buscando registro de sessão:', sessionId)
    return { id: sessionId, number: '', status: 'created' }
  }

  async saveReceivedMessage(message, sessionId) {
    console.log('Salvando mensagem recebida:', { message, sessionId })
  }
}

module.exports = SessionService