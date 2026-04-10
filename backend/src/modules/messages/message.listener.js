/**
 * ============================================
 * ARQUIVO: modules/messages/message.listener.js
 * ============================================
 * Listener de mensagens recebidas.
 * Escuta mensagens do WhatsApp e coordena processamento.
 * Notifica callbacks registrados sobre novos eventos.
 */

class MessageListener {
  /**
   * Construtor do listener.
   * Recebe instância do serviço de mensagens.
   * 
   * @param {Object} params - Parâmetros de construção
   * @param {MessageService} params.messageService - Serviço de mensagens
   */
  constructor({ messageService } = {}) {
    this.messageService = messageService;

    // Arrays de callbacks para notificação de eventos
    this.callbacks = {
      onMessage: [], // Callbacks para novas mensagens
      onLog: []      // Callbacks para logs de eventos
    };
  }

  // ============================================
  // REGISTRO DE CALLBACKS
  // ============================================

  /**
   * Registra callback para receber novas mensagens.
   * Útil para componentes que precisam reagir a mensagens.
   * 
   * @param {Function} callback - Função (message, results) => void
   */
  onMessage(callback) {
    this.callbacks.onMessage.push(callback);
  }

  /**
   * Registra callback para receber logs de eventos.
   * Útil para logging centralizado ou interface de debug.
   * 
   * @param {Function} callback - Função (log) => void
   */
  onLog(callback) {
    this.callbacks.onLog.push(callback);
  }

  // ============================================
  // PROCESSAMENTO DE MENSAGENS
  // ============================================

  /**
   * Processa mensagem recebida do WhatsApp.
   * Valida, formata, salva, processa regras e notifica callbacks.
   * 
   * @param {Object} message - Mensagem crua do Baileys
   * @param {string} sessionId - ID da sessão origem
   * @returns {Array} Resultados das regras disparadas
   */
  async handleMessage(message, sessionId) {
    // Valida se mensagem tem conteúdo
    if (!message || !message.message) return;

    // Formata mensagem com sessionId incluído
    const processedMessage = {
      ...message,
      sessionId
    };

    // Encaminha para serviço processar (salvar + disparar regras)
    const results = await this.messageService.processIncomingMessage(
      processedMessage,
      sessionId
    );

    // ============================================
    // NOTIFICA CALLBACKS DE MENSAGEM
    // ============================================
    // Itera sobre todos os callbacks registrados
    for (const callback of this.callbacks.onMessage) {
      try {
        // Chama callback com mensagem processada e resultados
        callback(processedMessage, results);
      } catch (error) {
        // Isola erros de callbacks para não quebrar o fluxo
        console.error('Erro no callback de mensagem:', error);
      }
    }

    // ============================================
    // GERA LOGS PARA REGRAS DISPARADAS
    // ============================================
    // Para cada regra que foi disparada, emite log
    for (const { rule, action } of results) {
      if (action) {
        this.emitLog({
          type: 'rule_triggered',      // Tipo do evento
          rule: rule.name,             // Nome da regra
          action: action.type,         // Tipo da ação executada
          message: processedMessage,   // Mensagem que disparou
          timestamp: new Date()        // Quando ocorreu
        });
      }
    }

    return results;
  }

  // ============================================
  // EMISSÃO DE LOGS
  // ============================================

  /**
   * Emite log para todos os callbacks registrados.
   * Log contém informações sobre eventos relevantes.
   * 
   * @param {Object} log - Dados do log
   */
  emitLog(log) {
    // Itera sobre callbacks de log
    for (const callback of this.callbacks.onLog) {
      try {
        callback(log);
      } catch (error) {
        // Isola erros de callbacks
        console.error('Erro no callback de log:', error);
      }
    }
  }

  // ============================================
  // ACESSO AO SERVIÇO
  // ============================================

  /**
   * Retorna referência ao serviço de mensagens.
   * Útil para componentes que precisam acessar diretamente.
   * 
   * @returns {MessageService} Instância do serviço
   */
  getMessageService() {
    return this.messageService;
  }
}

module.exports = MessageListener;
