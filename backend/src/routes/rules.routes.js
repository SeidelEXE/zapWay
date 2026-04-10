/**
 * ============================================
 * ARQUIVO: routes/rules.routes.js
 * ============================================
 * Rotas REST para gerenciamento de regras de automação.
 * Define os endpoints HTTP para CRUD de regras.
 */

/**
 * Função de registro das rotas de regras.
 * Recebe a instância do Fastify e as opções configuradas no app.js
 * 
 * @param {FastifyInstance} fastify - Instância do Fastify
 * @param {Object} options - Opções passadas no registro (rulesController)
 */
async function rulesRoutes(fastify, options) {
  // Extrai o controller de regras das opções
  const { rulesController } = options;

  // ============================================
  // GET / - Lista todas as regras
  // Retorna array com todas as regras cadastradas
  // ============================================
  fastify.get('/', rulesController.listRules.bind(rulesController));

  // ============================================
  // GET /:ruleId - Obtém uma regra específica
  // Parâmetro: ruleId (ID da regra)
  // ============================================
  fastify.get('/:ruleId', rulesController.getRule.bind(rulesController));

  // ============================================
  // POST / - Cria uma nova regra
  // Body: { name, trigger, triggerValue, action, actionValue, enabled }
  // ============================================
  fastify.post('/', rulesController.createRule.bind(rulesController));

  // ============================================
  // PUT /:ruleId - Atualiza uma regra existente
  // Parâmetro: ruleId (ID da regra)
  // Body: campos a atualizar
  // ============================================
  fastify.put('/:ruleId', rulesController.updateRule.bind(rulesController));

  // ============================================
  // PATCH /:ruleId/toggle - Alterna status ativo/inativo
  // Parâmetro: ruleId (ID da regra)
  // Útil para ativar/desativar regras rapidamente
  // ============================================
  fastify.patch('/:ruleId/toggle', rulesController.toggleRule.bind(rulesController));

  // ============================================
  // DELETE /:ruleId - Remove uma regra
  // Parâmetro: ruleId (ID da regra)
  // ============================================
  fastify.delete('/:ruleId', rulesController.deleteRule.bind(rulesController));
}

module.exports = rulesRoutes;
