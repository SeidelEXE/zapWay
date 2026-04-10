/**
 * ============================================
 * ARQUIVO: routes/sessions.routes.js
 * ============================================
 * Rotas REST para gerenciamento de sessões WhatsApp.
 * Define os endpoints HTTP para CRUD de sessões.
 */

const SessionController = require('../modules/sessions/session.controller');

/**
 * Função de registro das rotas de sessões.
 * Recebe a instância do Fastify e as opções configuradas no app.js
 * 
 * @param {FastifyInstance} fastify - Instância do Fastify
 * @param {Object} options - Opções passadas no registro (sessionService)
 */
async function sessionsRoutes(fastify, options) {
  // Cria uma nova instância do controller passando o serviço de sessões
  // O .bind() garante que 'this' referencie o controller nos métodos
  const sessionController = new SessionController(options.sessionService);

  // ============================================
  // GET / - Lista todas as sessões
  // Retorna array com todas as sessões ativas
  // ============================================
  fastify.get('/', sessionController.listSessions.bind(sessionController));

  // ============================================
  // GET /:sessionId - Obtém uma sessão específica
  // Parâmetro: sessionId (ID da sessão)
  // ============================================
  fastify.get('/:sessionId', sessionController.getSession.bind(sessionController));

  // ============================================
  // POST / - Cria uma nova sessão
  // Body: { sessionId?, name? }
  // Retorna dados da sessão criada + QR Code via WebSocket
  // ============================================
  fastify.post('/', sessionController.createSession.bind(sessionController));

  // ============================================
  // DELETE /:sessionId - Remove uma sessão
  // Parâmetro: sessionId (ID da sessão a remover)
  // ============================================
  fastify.delete('/:sessionId', sessionController.removeSession.bind(sessionController));

  // ============================================
  // POST /:sessionId/reconnect - Reconecta uma sessão
  // Parâmetro: sessionId (ID da sessão)
  // Útil quando a conexão com WhatsApp é perdida
  // ============================================
  fastify.post('/:sessionId/reconnect', sessionController.reconnectSession.bind(sessionController));

  // ============================================
  // POST /:sessionId/send - Envia mensagem
  // Parâmetro: sessionId (ID da sessão)
  // Body: { number, content }
  // ============================================
  fastify.post('/:sessionId/send', sessionController.sendMessage.bind(sessionController));
}

module.exports = sessionsRoutes;
