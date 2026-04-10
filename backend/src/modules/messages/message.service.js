/**
 * ============================================
 * ARQUIVO: modules/messages/message.service.js
 * ============================================
 * Serviço de gerenciamento de mensagens.
 * Responsável por armazenar, recuperar e processar mensagens.
 * Armazena mensagens em memória organizadas por sessão.
 */

class MessageService {
  /**
   * Construtor do serviço de mensagens.
   * Pode receber referência ao serviço de regras para automação.
   * 
   * @param {Object} params - Parâmetros de construção
   * @param {RulesService} [params.rulesService] - Instância do serviço de regras
   */
  constructor({ rulesService } = {}) {
    this.rulesService = rulesService;

    // Mapa para armazenar mensagens por sessão
    // Key: sessionId, Value: array de mensagens
    this.messages = new Map();
  }

  // ============================================
  // ARMAZENAMENTO DE MENSAGENS
  // ============================================

  /**
   * Salva uma mensagem no armazenamento.
   * Formata dados padronizados antes de armazenar.
   * 
   * @param {Object} message - Mensagem crua do Baileys
   * @param {string} sessionId - ID da sessão origem
   * @returns {Object} Mensagem formatada e armazenada
   */
  async saveMessage(message, sessionId) {
    // Recupera array de mensagens da sessão ou cria novo
    const sessionMessages = this.messages.get(sessionId) || [];

    // Formata mensagem com estrutura padronizada
    const formattedMessage = {
      id: message.key?.id || Date.now().toString(), // ID único ou timestamp
      sessionId,                                     // Sessão origem
      from: message.key?.remoteJid,                 // Remetente (número completo)
      fromMe: message.key?.fromMe || false,         // Se foi enviada por nós
      text: message.message?.text || '',             // Texto da mensagem
      pushName: message.pushName || 'Unknown',       // Nome do contato
      timestamp: message.timestamp || Date.now(),    // Timestamp original
      receivedAt: new Date()                         // Timestamp do processamento
    };

    // Adiciona à lista da sessão
    sessionMessages.push(formattedMessage);

    // Atualiza no mapa
    this.messages.set(sessionId, sessionMessages);

    return formattedMessage;
  }

  // ============================================
  // LEITURA DE MENSAGENS
  // ============================================

  /**
   * Lista mensagens de uma sessão com paginação.
   * 
   * @param {string} sessionId - ID da sessão
   * @param {Object} options - Opções de paginação
   * @param {number} [options.limit=50] - Número máximo de mensagens
   * @param {number} [options.offset=0] - Deslocamento inicial
   * @returns {Array} Lista de mensagens
   */
  async getMessages(sessionId, { limit = 50, offset = 0 } = {}) {
    // Recupera mensagens da sessão
    const sessionMessages = this.messages.get(sessionId) || [];

    // Retorna fatia do array (paginação)
    return sessionMessages.slice(offset, offset + limit);
  }

  /**
   * Busca uma mensagem específica pelo ID.
   * 
   * @param {string} sessionId - ID da sessão
   * @param {string} messageId - ID da mensagem
   * @returns {Object|null} Mensagem encontrada ou null
   */
  async getMessageById(sessionId, messageId) {
    const sessionMessages = this.messages.get(sessionId) || [];

    // Busca mensagem com ID específico
    return sessionMessages.find(m => m.id === messageId) || null;
  }

  // ============================================
  // REMOÇÃO DE MENSAGENS
  // ============================================

  /**
   * Remove uma mensagem específica.
   * 
   * @param {string} sessionId - ID da sessão
   * @param {string} messageId - ID da mensagem
   * @returns {boolean} True se removida, false se não encontrada
   */
  async deleteMessage(sessionId, messageId) {
    const sessionMessages = this.messages.get(sessionId) || [];

    // Localiza índice da mensagem
    const index = sessionMessages.findIndex(m => m.id === messageId);

    if (index !== -1) {
      // Remove mensagem do array
      sessionMessages.splice(index, 1);
      return true;
    }

    return false;
  }

  // ============================================
  // PROCESSAMENTO DE MENSAGENS
  // ============================================

  /**
   * Processa mensagem recebida: salva e dispara regras.
   * Chamado quando nova mensagem chega do WhatsApp.
   * 
   * @param {Object} message - Mensagem recebida
   * @param {string} sessionId - ID da sessão origem
   * @returns {Array} Resultados das regras disparadas
   */
  async processIncomingMessage(message, sessionId) {
    // Primeiro salva a mensagem
    await this.saveMessage(message, sessionId);

    // Se há serviço de regras, processa automação
    if (this.rulesService) {
      const results = await this.rulesService.processMessage(message, sessionId);
      return results;
    }

    return [];
  }

  // ============================================
  // LOGS DE MENSAGENS
  // ============================================

  /**
   * Retorna logs de todas as mensagens de todas as sessões.
   * Ordena por timestamp (mais recentes primeiro).
   * 
   * @param {Object} options - Opções de consulta
   * @param {number} [options.limit=100] - Número máximo de logs
   * @returns {Array} Lista de logs ordenados
   */
  async getAllLogs({ limit = 100 } = {}) {
    const allLogs = [];

    // Itera sobre todas as sessões
    for (const [sessionId, messages] of this.messages) {
      // Adiciona cada mensagem aos logs com sessionId
      for (const msg of messages) {
        allLogs.push({
          ...msg,
          session: sessionId // Adiciona campo session para identificação
        });
      }
    }

    // Ordena por timestamp (mais recente primeiro)
    return allLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      // Limita quantidade de resultados
      .slice(0, limit);
  }

  // ============================================
  // LIMPEZA
  // ============================================

  /**
   * Remove todas as mensagens de uma sessão.
   * Útil quando sessão é removida.
   * 
   * @param {string} sessionId - ID da sessão
   */
  clearSession(sessionId) {
    this.messages.delete(sessionId);
  }
}

module.exports = MessageService;
