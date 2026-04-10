/**
 * ============================================
 * ARQUIVO: routes/messages.routes.js
 * ============================================
 * Rotas REST para gerenciamento de mensagens.
 * Define os endpoints HTTP para listar, buscar e deletar mensagens.
 */

/**
 * Função de registro das rotas de mensagens.
 * Recebe a instância do Fastify e as opções configuradas no app.js
 * 
 * @param {FastifyInstance} fastify - Instância do Fastify
 * @param {Object} options - Opções passadas no registro (messageService)
 */
async function messagesRoutes(fastify, options) {
  // Extrai o serviço de mensagens das opções
  const { messageService } = options;

  // ============================================
  // GET /:sessionId - Lista mensagens de uma sessão
  // Parâmetro: sessionId (ID da sessão)
  // Query params opcionais:
  //   - limit: número máximo de mensagens (padrão 50)
  //   - offset: deslocamento para paginação
  // ============================================
  fastify.get('/:sessionId', async (request, reply) => {
    try {
      // Extrai parâmetros da URL
      const { sessionId } = request.params;
      // Extrai query params para paginação
      const { limit, offset } = request.query;
      
      // Chama o serviço para buscar mensagens
      const messages = await messageService.getMessages(sessionId, { limit, offset });
      
      return reply.send(messages);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // ============================================
  // GET /:sessionId/:messageId - Busca mensagem específica
  // Parâmetros: sessionId, messageId
  // ============================================
  fastify.get('/:sessionId/:messageId', async (request, reply) => {
    try {
      const { sessionId, messageId } = request.params;
      
      // Busca mensagem pelo ID
      const message = await messageService.getMessageById(sessionId, messageId);
      
      // Retorna 404 se não encontrar
      if (!message) {
        return reply.code(404).send({ error: 'Mensagem não encontrada' });
      }
      
      return reply.send(message);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // ============================================
  // GET /logs - Lista todos os logs de mensagens
  // Query params opcionais:
  //   - limit: número máximo de logs (padrão 100)
  // Retorna mensagens de todas as sessões ordenadas por tempo
  // ============================================
  fastify.get('/logs', async (request, reply) => {
    try {
      const { limit } = request.query;
      
      // Busca todos os logs de mensagens
      const logs = await messageService.getAllLogs({ limit });
      
      return reply.send(logs);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // ============================================
  // DELETE /:sessionId/:messageId - Remove uma mensagem
  // Parâmetros: sessionId, messageId
  // ============================================
  fastify.delete('/:sessionId/:messageId', async (request, reply) => {
    try {
      const { sessionId, messageId } = request.params;
      
      // Tenta deletar a mensagem
      const deleted = await messageService.deleteMessage(sessionId, messageId);
      
      // Retorna 404 se não encontrou para deletar
      if (!deleted) {
        return reply.code(404).send({ error: 'Mensagem não encontrada' });
      }
      
      return reply.send({ success: true });
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });
}

module.exports = messagesRoutes;
