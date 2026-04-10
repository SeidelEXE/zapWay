/**
 * ============================================
 * ARQUIVO: modules/sessions/session.controller.js
 * ============================================
 * Controller de sessões WhatsApp.
 * Camada intermediária entre as rotas HTTP e o serviço.
 * Trata requisições, extrai parâmetros e retorna respostas.
 */

class SessionController {
  /**
   * Construtor do controller.
   * Recebe uma instância do serviço de sessões via injeção de dependência.
   * 
   * @param {SessionService} sessionService - Instância do serviço de sessões
   */
  constructor(sessionService) {
    this.sessionService = sessionService;
  }

  // ============================================
  // POST /api/sessions
  // ============================================
  /**
   * Cria uma nova sessão WhatsApp.
   * Extrai dados do body da requisição e delega ao serviço.
   * 
   * @param {FastifyRequest} request - Requisição HTTP com body
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {201} Dados da sessão criada
   * @returns {400} Erro na criação
   */
  async createSession(request, reply) {
    try {
      // Extrai dados do corpo da requisição
      const sessionData = request.body;

      // Chama o serviço para criar a sessão
      const result = await this.sessionService.createSession(sessionData);

      // Retorna 201 (Created) com dados da sessão
      return reply.code(201).send(result);
    } catch (error) {
      // Retorna 400 (Bad Request) em caso de erro
      return reply.code(400).send({
        error: error.message || 'Erro ao criar sessão'
      });
    }
  }

  // ============================================
  // GET /api/sessions
  // ============================================
  /**
   * Lista todas as sessões ativas.
   * 
   * @param {FastifyRequest} request - Requisição HTTP
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Lista de sessões
   * @returns {500} Erro interno
   */
  async listSessions(request, reply) {
    try {
      // Chama o serviço para listar sessões
      const sessions = await this.sessionService.listSessions();

      // Retorna 200 com array de sessões
      return reply.send(sessions);
    } catch (error) {
      // Retorna 500 em caso de erro interno
      return reply.code(500).send({
        error: error.message || 'Erro ao listar sessões'
      });
    }
  }

  // ============================================
  // GET /api/sessions/:sessionId
  // ============================================
  /**
   * Obtém detalhes de uma sessão específica.
   * Extrai sessionId dos parâmetros da URL.
   * 
   * @param {FastifyRequest} request - Requisição com params.sessionId
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Dados da sessão
   * @returns {404} Sessão não encontrada
   */
  async getSession(request, reply) {
    try {
      // Extrai sessionId dos parâmetros da URL
      const { sessionId } = request.params;

      // Chama o serviço para obter dados da sessão
      const session = await this.sessionService.getSession(sessionId);

      // Retorna 200 com dados da sessão
      return reply.send(session);
    } catch (error) {
      // Retorna 404 se sessão não existe
      return reply.code(404).send({
        error: error.message || 'Sessão não encontrada'
      });
    }
  }

  // ============================================
  // DELETE /api/sessions/:sessionId
  // ============================================
  /**
   * Remove uma sessão existente.
   * 
   * @param {FastifyRequest} request - Requisição com params.sessionId
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Confirmação da remoção
   * @returns {400} Erro na remoção
   */
  async removeSession(request, reply) {
    try {
      // Extrai sessionId dos parâmetros
      const { sessionId } = request.params;

      // Chama o serviço para remover
      const result = await this.sessionService.removeSession(sessionId);

      // Retorna 200 com confirmação
      return reply.send(result);
    } catch (error) {
      // Retorna 400 se sessão não existe ou outro erro
      return reply.code(400).send({
        error: error.message || 'Erro ao remover sessão'
      });
    }
  }

  // ============================================
  // POST /api/sessions/:sessionId/send
  // ============================================
  /**
   * Envia uma mensagem de texto via WhatsApp.
   * Extrai sessionId da URL e dados do body.
   * 
   * @param {FastifyRequest} request - params.sessionId, body.number, body.content
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Mensagem enviada com sucesso
   * @returns {400} Erro no envio
   */
  async sendMessage(request, reply) {
    try {
      // Extrai parâmetros da URL
      const { sessionId } = request.params;
      // Extrai dados do corpo da requisição
      const { number, content } = request.body;

      // Chama o serviço para enviar mensagem
      const result = await this.sessionService.sendMessage(sessionId, number, content);

      // Retorna 200 com resultado do envio
      return reply.send(result);
    } catch (error) {
      // Retorna 400 em caso de erro (número inválido, etc)
      return reply.code(400).send({
        error: error.message || 'Erro ao enviar mensagem'
      });
    }
  }

  // ============================================
  // POST /api/sessions/:sessionId/reconnect
  // ============================================
  /**
   * Reconecta uma sessão que está desconectada.
   * 
   * @param {FastifyRequest} request - params.sessionId
   * @param {FastifyReply} reply - Resposta HTTP
   * @returns {200} Reconexão iniciada
   * @returns {400} Erro na reconexão
   */
  async reconnectSession(request, reply) {
    try {
      // Extrai sessionId dos parâmetros
      const { sessionId } = request.params;

      // Chama o serviço para reconectar
      const result = await this.sessionService.reconnectSession(sessionId);

      // Retorna 200 com status da reconexão
      return reply.send(result);
    } catch (error) {
      // Retorna 400 se sessão não existe
      return reply.code(400).send({
        error: error.message || 'Erro ao reconectar sessão'
      });
    }
  }
}

module.exports = SessionController;
