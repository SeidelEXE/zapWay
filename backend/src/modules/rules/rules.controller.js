/**
 * ============================================
 * ARQUIVO: modules/rules/rules.controller.js
 * ============================================
 * Controller de regras de automação.
 * Camada intermediária entre rotas HTTP e o serviço de regras.
 * Trata requisições e retorna respostas padronizadas.
 */

class RulesController {
  /**
   * Construtor do controller.
   * Recebe instância do serviço via injeção de dependência.
   * 
   * @param {Object} params - Parâmetros de construção
   * @param {RulesService} params.rulesService - Instância do serviço de regras
   */
  constructor({ rulesService } = {}) {
    this.rulesService = rulesService;
  }

  // ============================================
  // POST /api/rules
  // ============================================
  /**
   * Cria uma nova regra de automação.
   * 
   * @param {FastifyRequest} request - Requisição com body
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {201} Regra criada
   * @returns {400} Erro na criação
   */
  async createRule(request, reply) {
    try {
      // Extrai dados do body (aceita objeto vazio também)
      const rule = await this.rulesService.createRule(request.body || {});

      // Retorna 201 (Created) com dados da regra
      return reply.code(201).send(rule);
    } catch (error) {
      // Retorna 400 em caso de erro (validação, etc)
      return reply.code(400).send({ error: error.message });
    }
  }

  // ============================================
  // GET /api/rules
  // ============================================
  /**
   * Lista todas as regras cadastradas.
   * 
   * @param {FastifyRequest} request - Requisição HTTP
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Lista de regras
   * @returns {500} Erro interno
   */
  async listRules(request, reply) {
    try {
      // Chama serviço para listar regras
      const rules = await this.rulesService.getRules();

      // Retorna 200 com array de regras
      return reply.send(rules);
    } catch (error) {
      // Retorna 500 em caso de erro interno
      return reply.code(500).send({ error: error.message });
    }
  }

  // ============================================
  // GET /api/rules/:ruleId
  // ============================================
  /**
   * Obtém detalhes de uma regra específica.
   * 
   * @param {FastifyRequest} request - params.ruleId
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Dados da regra
   * @returns {404} Regra não encontrada
   * @returns {500} Erro interno
   */
  async getRule(request, reply) {
    try {
      // Extrai ID dos parâmetros da URL
      const { ruleId } = request.params;

      // Busca regra no serviço
      const rule = await this.rulesService.getRule(ruleId);

      // Retorna 404 se não encontrar
      if (!rule) {
        return reply.code(404).send({ error: 'Regra não encontrada' });
      }

      // Retorna 200 com dados da regra
      return reply.send(rule);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  }

  // ============================================
  // PUT /api/rules/:ruleId
  // ============================================
  /**
   * Atualiza uma regra existente.
   * Usa PUT para substituição completa de campos.
   * 
   * @param {FastifyRequest} request - params.ruleId, body
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Regra atualizada
   * @returns {400} Erro na atualização
   */
  async updateRule(request, reply) {
    try {
      // Extrai ID dos parâmetros
      const { ruleId } = request.params;
      // Extrai campos do body
      const rule = await this.rulesService.updateRule(ruleId, request.body);

      // Retorna 200 com regra atualizada
      return reply.send(rule);
    } catch (error) {
      // Retorna 400 se regra não existe ou erro de validação
      return reply.code(400).send({ error: error.message });
    }
  }

  // ============================================
  // DELETE /api/rules/:ruleId
  // ============================================
  /**
   * Remove uma regra existente.
   * 
   * @param {FastifyRequest} request - params.ruleId
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Confirmação
   * @returns {400} Erro na remoção
   */
  async deleteRule(request, reply) {
    try {
      // Extrai ID dos parâmetros
      const { ruleId } = request.params;

      // Chama serviço para remover
      const result = await this.rulesService.deleteRule(ruleId);

      // Retorna 200 com confirmação
      return reply.send(result);
    } catch (error) {
      // Retorna 400 se regra não existe
      return reply.code(400).send({ error: error.message });
    }
  }

  // ============================================
  // PATCH /api/rules/:ruleId/toggle
  // ============================================
  /**
   * Alterna status ativo/inativo de uma regra.
   * Usa PATCH pois modifica apenas um campo específico.
   * 
   * @param {FastifyRequest} request - params.ruleId
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Regra com novo status
   * @returns {400} Erro na operação
   */
  async toggleRule(request, reply) {
    try {
      // Extrai ID dos parâmetros
      const { ruleId } = request.params;

      // Chama serviço para inverter status
      const rule = await this.rulesService.toggleRule(ruleId);

      // Retorna 200 com regra atualizada
      return reply.send(rule);
    } catch (error) {
      // Retorna 400 se regra não existe
      return reply.code(400).send({ error: error.message });
    }
  }
}

module.exports = RulesController;
