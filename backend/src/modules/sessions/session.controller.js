/**
 * Controller de sessões - responsável pelas requisições HTTP
 */
class SessionController {
  /**
   * @param {SessionService} sessionService - Instância do serviço de sessões
   */
  constructor(sessionService) {
    this.sessionService = sessionService;
  }

  /**
   * Cria uma nova sessão
   * @param {FastifyRequest} request - Requisição HTTP
   * @param {FastifyReply} reply - Resposta HTTP
   */
  async createSession(request, reply) {
    try {
      const sessionData = request.body;
      const result = await this.sessionService.createSession(sessionData);
      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(400).send({
        error: error.message || 'Erro ao criar sessão'
      });
    }
  }

  /**
   * Lista todas as sessões
   * @param {FastifyRequest} request - Requisição HTTP
   * @param {FastifyReply} reply - Resposta HTTP
   */
  async listSessions(request, reply) {
    try {
      const sessions = await this.sessionService.listSessions();
      return reply.send(sessions);
    } catch (error) {
      return reply.code(500).send({
        error: error.message || 'Erro ao listar sessões'
      });
    }
  }

  /**
   * Obtém uma sessão específica
   * @param {FastifyRequest} request - Requisição HTTP
   * @param {FastifyReply} reply - Resposta HTTP
   */
  async getSession(request, reply) {
    try {
      const { sessionId } = request.params;
      const session = await this.sessionService.getSession(sessionId);
      return reply.send(session);
    } catch (error) {
      return reply.code(404).send({
        error: error.message || 'Sessão não encontrada'
      });
    }
  }

  /**
   * Remove uma sessão
   * @param {FastifyRequest} request - Requisição HTTP
   * @param {FastifyReply} reply - Resposta HTTP
   */
  async removeSession(request, reply) {
    try {
      const { sessionId } = request.params;
      const result = await this.sessionService.removeSession(sessionId);
      return reply.send(result);
    } catch (error) {
      return reply.code(400).send({
        error: error.message || 'Erro ao remover sessão'
      });
    }
  }

  /**
   * Envia mensagem via uma sessão específica
   * @param {FastifyRequest} request - Requisição HTTP
   * @param {FastifyReply} reply - Resposta HTTP
   */
  async sendMessage(request, reply) {
    try {
      const { sessionId } = request.params;
      const { number, content } = request.body;

      const result = await this.sessionService.sendMessage(sessionId, number, content);
      return reply.send(result);
    } catch (error) {
      return reply.code(400).send({
        error: error.message || 'Erro ao enviar mensagem'
      });
    }
  }
}

module.exports = SessionController;