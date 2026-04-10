/**
 * ============================================
 * ARQUIVO: modules/rules/rules.engine.js
 * ============================================
 * Motor de regras de automação.
 * Responsável por avaliar mensagens contra regras e executar ações.
 * Implementa matching de triggers (palavras-chave, comandos) e ações.
 */

class RulesEngine {
  /**
   * Construtor do motor de regras.
   * Inicializa array de regras em memória.
   */
  constructor() {
    this.rules = [];
  }

  // ============================================
  // GERENCIAMENTO DE REGRAS
  // ============================================

  /**
   * Adiciona uma regra ao motor.
   * 
   * @param {Object} rule - Objeto da regra
   */
  addRule(rule) {
    this.rules.push(rule);
  }

  /**
   * Remove uma regra do motor pelo ID.
   * 
   * @param {string} ruleId - ID da regra
   */
  removeRule(ruleId) {
    // Filtra removendo a regra com o ID especificado
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Atualiza uma regra existente.
   * 
   * @param {string} ruleId - ID da regra
   * @param {Object} updates - Campos a atualizar
   * @returns {Object|null} Regra atualizada ou null se não encontrada
   */
  updateRule(ruleId, updates) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      // Faz merge das atualizações com a regra existente
      this.rules[index] = { ...this.rules[index], ...updates };
      return this.rules[index];
    }
    return null;
  }

  /**
   * Retorna todas as regras.
   * Retorna cópia para evitar mutação externa.
   * 
   * @returns {Array} Cópia do array de regras
   */
  getRules() {
    return [...this.rules];
  }

  /**
   * Busca uma regra pelo ID.
   * 
   * @param {string} ruleId - ID da regra
   * @returns {Object|undefined} Regra encontrada ou undefined
   */
  getRule(ruleId) {
    return this.rules.find(r => r.id === ruleId);
  }

  /**
   * Retorna apenas regras habilitadas.
   * Regras desabilitadas (enabled: false) são ignoradas no processamento.
   * 
   * @returns {Array} Lista de regras habilitadas
   */
  getEnabledRules() {
    return this.rules.filter(r => r.enabled !== false);
  }

  // ============================================
  // AVALIAÇÃO DE MENSAGENS
  // ============================================

  /**
   * Avalia uma mensagem contra todas as regras habilitadas.
   * Retorna lista de regras que foram disparadas.
   * 
   * @param {Object} message - Mensagem recebida do WhatsApp
   * @param {string} sessionId - ID da sessão origem
   * @returns {Array} Lista de regras disparadas
   */
  evaluateRules(message, sessionId) {
    // Busca apenas regras que estão habilitadas
    const enabledRules = this.getEnabledRules();
    const triggeredRules = [];

    // Itera sobre cada regra e verifica se deve ser disparada
    for (const rule of enabledRules) {
      if (this.matchTrigger(rule, message)) {
        triggeredRules.push(rule);
      }
    }

    return triggeredRules;
  }

  /**
   * Verifica se uma regra deve ser disparada pela mensagem.
   * Compara o tipo de trigger com o conteúdo da mensagem.
   * 
   * @param {Object} rule - Regra a ser avaliada
   * @param {Object} message - Mensagem recebida
   * @returns {boolean} True se a regra deve ser disparada
   */
  matchTrigger(rule, message) {
    const { trigger, triggerValue } = rule;

    // Requer trigger definido e mensagem com texto
    if (!trigger || !message?.message?.text) {
      return false;
    }

    // Normaliza texto da mensagem para minúsculas
    const messageText = message.message.text.toLowerCase();

    // Seleciona método de comparação baseado no tipo de trigger
    switch (trigger) {
      case 'keyword':
        // Dispara se mensagem contém palavra-chave
        return this.matchKeyword(triggerValue, messageText);

      case 'command':
        // Dispara se mensagem começa com comando (!comando)
        return this.matchCommand(triggerValue, messageText);

      case 'message':
        // Dispara para qualquer mensagem
        return true;

      default:
        return false;
    }
  }

  /**
   * Verifica se a mensagem contém alguma palavra-chave.
   * Suporta múltiplas palavras separadas por vírgula.
   * 
   * @param {string} keyword - Palavras-chave separadas por vírgula
   * @param {string} messageText - Texto da mensagem (já em minúsculas)
   * @returns {boolean} True se alguma palavra for encontrada
   */
  matchKeyword(keyword, messageText) {
    if (!keyword) return false;

    // Separa palavras por vírgula e remove espaços extras
    const keywords = keyword.toLowerCase().split(',').map(k => k.trim());

    // Verifica se alguma palavra está contida na mensagem
    return keywords.some(k => messageText.includes(k));
  }

  /**
   * Verifica se a mensagem começa com um comando específico.
   * Comandos devem começar com "!" (pode ser adiciondo automaticamente).
   * 
   * @param {string} command - Nome do comando
   * @param {string} messageText - Texto da mensagem
   * @returns {boolean} True se mensagem é o comando
   */
  matchCommand(command, messageText) {
    if (!command) return false;

    // Adiciona "!" se não presente
    const normalizedCommand = command.startsWith('!') ? command : `!${command}`;

    // Verifica se mensagem começa com o comando
    return messageText.startsWith(normalizedCommand.toLowerCase());
  }

  // ============================================
  // EXECUÇÃO DE AÇÕES
  // ============================================

  /**
   * Executa a ação definida na regra.
   * Prepara resposta com variáveis substituídas.
   * 
   * @param {Object} rule - Regra com ação configurada
   * @param {Object} message - Mensagem que disparou a regra
   * @param {Object} context - Contexto adicional (sessionId, etc)
   * @returns {Object} Dados da ação a ser executada
   */
  executeAction(rule, message, context) {
    const { action, actionValue } = rule;

    switch (action) {
      case 'reply':
        // Prepara resposta de texto com variáveis substituídas
        return {
          type: 'reply',
          content: this.parseVariables(actionValue, message)
        };

      case 'forward':
        // Prepara encaminhamento para número/chat
        return { type: 'forward', target: actionValue };

      case 'webhook':
        // Prepara chamada HTTP para webhook externo
        return {
          type: 'webhook',
          url: actionValue,
          data: this.formatWebhookData(rule, message)
        };

      default:
        return null;
    }
  }

  /**
   * Substitui variáveis nos conteúdos de resposta.
   * Variáveis disponíveis:
   *   {{name}} - Nome do remetente
   *   {{message}} - Texto da mensagem original
   *   {{number}} - Número do remetente
   * 
   * @param {string} content - Texto com variáveis
   * @param {Object} message - Mensagem original
   * @returns {string} Texto com variáveis substituídas
   */
  parseVariables(content, message) {
    if (!content) return '';

    return content
      // Substitui {{name}} pelo nome do contato
      .replace(/\{\{name\}\}/g, message.pushName || 'Usuário')
      // Substitui {{message}} pelo texto original
      .replace(/\{\{message\}\}/g, message.message?.text || '')
      // Substitui {{number}} pelo número do remetente
      .replace(/\{\{number\}\}/g, message.key?.remoteJid?.split('@')[0] || '');
  }

  /**
   * Formata dados para envio em webhook.
   * Inclui informações da regra e da mensagem.
   * 
   * @param {Object} rule - Regra que disparou
   * @param {Object} message - Mensagem original
   * @returns {Object} Dados formatados para webhook
   */
  formatWebhookData(rule, message) {
    return {
      rule: rule.name,           // Nome da regra
      trigger: rule.trigger,      // Tipo de trigger
      triggerValue: rule.triggerValue, // Valor do trigger
      message: message.message?.text, // Texto da mensagem
      sender: message.pushName,    // Nome do remetente
      senderNumber: message.key?.remoteJid, // Número completo
      timestamp: message.timestamp, // Timestamp da mensagem
      sessionId: message.sessionId // Sessão origem
    };
  }
}

module.exports = RulesEngine;
