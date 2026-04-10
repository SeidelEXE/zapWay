/**
 * ============================================
 * ARQUIVO: modules/rules/rules.service.js
 * ============================================
 * Serviço de gerenciamento de regras de automação.
 * Camada de negócio que gerencia CRUD e processamento de regras.
 * Armazena regras em memória e coordena com o RulesEngine.
 */

const { v4: uuidv4 } = require('uuid');

class RulesService {
  /**
   * Construtor do serviço de regras.
   * Recebe instância do motor de regras via injeção de dependência.
   * 
   * @param {Object} params - Parâmetros de construção
   * @param {RulesEngine} params.rulesEngine - Instância do motor de regras
   */
  constructor({ rulesEngine } = {}) {
    this.rulesEngine = rulesEngine; // Referência ao motor para processamento
    this.rules = [];               // Array em memória para armazenar regras
  }

  // ============================================
  // CRIAÇÃO DE REGRAS
  // ============================================

  /**
   * Cria uma nova regra de automação.
   * Valida dados, gera ID se necessário e registra no motor.
   * 
   * @param {Object} ruleData - Dados da regra
   * @param {string} [ruleData.id] - ID personalizado (gerado se não informado)
   * @param {string} ruleData.name - Nome da regra
   * @param {string} [ruleData.trigger='keyword'] - Tipo de gatilho
   * @param {string} [ruleData.triggerValue=''] - Valor do gatilho
   * @param {string} [ruleData.action='reply'] - Tipo de ação
   * @param {string} [ruleData.actionValue=''] - Valor da ação
   * @param {boolean} [ruleData.enabled=true] - Se a regra inicia ativa
   * @returns {Object} Regra criada com ID
   */
  async createRule(ruleData) {
    // Monta objeto da regra com valores padrão
    const rule = {
      // Gera UUID se não fornecido
      id: ruleData.id || uuidv4(),
      name: ruleData.name, // Nome é obrigatório
      trigger: ruleData.trigger || 'keyword', // Padrão: palavra-chave
      triggerValue: ruleData.triggerValue || '',
      action: ruleData.action || 'reply', // Padrão: responder
      actionValue: ruleData.actionValue || '',
      // Habilitada por padrão (true se não especificado explicitamente false)
      enabled: ruleData.enabled !== false,
      createdAt: new Date(), // Timestamp de criação
      updatedAt: new Date()  // Timestamp de atualização
    };

    // Armazena no array em memória
    this.rules.push(rule);

    // Se motor existe e regra está habilitada, adiciona ao motor
    if (this.rulesEngine && rule.enabled) {
      this.rulesEngine.addRule(rule);
    }

    return rule;
  }

  // ============================================
  // LEITURA DE REGRAS
  // ============================================

  /**
   * Lista todas as regras cadastradas.
   * Retorna cópia do array para evitar mutação externa.
   * 
   * @returns {Array} Lista de todas as regras
   */
  async getRules() {
    return [...this.rules];
  }

  /**
   * Busca uma regra específica pelo ID.
   * 
   * @param {string} ruleId - ID da regra
   * @returns {Object|null} Regra encontrada ou null
   */
  async getRule(ruleId) {
    return this.rules.find(r => r.id === ruleId) || null;
  }

  // ============================================
  // ATUALIZAÇÃO DE REGRAS
  // ============================================

  /**
   * Atualiza uma regra existente.
   * Substitui campos e sincroniza com o motor de regras.
   * 
   * @param {string} ruleId - ID da regra a atualizar
   * @param {Object} updates - Campos a atualizar
   * @returns {Object} Regra atualizada
   * @throws {Error} Se regra não for encontrada
   */
  async updateRule(ruleId, updates) {
    // Localiza índice da regra
    const index = this.rules.findIndex(r => r.id === ruleId);

    // Lança erro se não encontrar
    if (index === -1) {
      throw new Error(`Regra ${ruleId} não encontrada`);
    }

    // Salva referência da regra antiga
    const oldRule = this.rules[index];

    // Cria nova versão com merge das atualizações
    const updatedRule = {
      ...oldRule,
      ...updates,
      id: ruleId, // Garante que ID não é alterado
      updatedAt: new Date() // Atualiza timestamp
    };

    // Atualiza no array
    this.rules[index] = updatedRule;

    // Sincroniza com motor de regras
    if (this.rulesEngine) {
      // Remove versão antiga do motor
      this.rulesEngine.removeRule(ruleId);

      // Adiciona nova versão se ainda estiver habilitada
      if (updatedRule.enabled) {
        this.rulesEngine.addRule(updatedRule);
      }
    }

    return updatedRule;
  }

  // ============================================
  // REMOÇÃO DE REGRAS
  // ============================================

  /**
   * Remove uma regra existente.
   * Remove do armazenamento e do motor de regras.
   * 
   * @param {string} ruleId - ID da regra a remover
   * @returns {Object} Confirmação de remoção
   * @throws {Error} Se regra não for encontrada
   */
  async deleteRule(ruleId) {
    // Localiza índice da regra
    const index = this.rules.findIndex(r => r.id === ruleId);

    // Lança erro se não encontrar
    if (index === -1) {
      throw new Error(`Regra ${ruleId} não encontrada`);
    }

    // Remove do array
    this.rules.splice(index, 1);

    // Remove do motor de regras se existir
    if (this.rulesEngine) {
      this.rulesEngine.removeRule(ruleId);
    }

    return { success: true };
  }

  // ============================================
  // TOGGLE DE STATUS
  // ============================================

  /**
   * Alterna status ativo/inativo de uma regra.
   * Útil para ativar/desativar rapidamente sem atualizar outros campos.
   * 
   * @param {string} ruleId - ID da regra
   * @returns {Object} Regra com status invertido
   * @throws {Error} Se regra não for encontrada
   */
  async toggleRule(ruleId) {
    // Busca regra atual
    const rule = await this.getRule(ruleId);

    if (!rule) {
      throw new Error(`Regra ${ruleId} não encontrada`);
    }

    // Inverte valor de enabled e atualiza
    return this.updateRule(ruleId, { enabled: !rule.enabled });
  }

  // ============================================
  // PROCESSAMENTO DE MENSAGENS
  // ============================================

  /**
   * Processa uma mensagem recebida contra todas as regras.
   * Avalia triggers e executa ações das regras disparadas.
   * 
   * @param {Object} message - Mensagem recebida do WhatsApp
   * @param {string} sessionId - ID da sessão origem
   * @returns {Array} Lista de resultados {rule, action}
   */
  async processMessage(message, sessionId) {
    // Retorna array vazio se não houver motor configurado
    if (!this.rulesEngine) {
      return [];
    }

    // Avalia mensagem contra todas as regras habilitadas
    const triggeredRules = this.rulesEngine.evaluateRules(message, sessionId);
    const results = [];

    // Itera sobre regras disparadas e executa ações
    for (const rule of triggeredRules) {
      const action = this.rulesEngine.executeAction(rule, message, { sessionId });
      if (action) {
        results.push({ rule, action });
      }
    }

    return results;
  }
}

module.exports = RulesService;
