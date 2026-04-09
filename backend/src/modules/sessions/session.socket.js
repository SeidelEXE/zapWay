/**
 * Manipulador de eventos WebSocket para sessões
 * Responsável por emitir eventos em tempo real para o frontend
 */
class SessionSocket {
  /**
   * @param {Object} io - Instância do Socket.IO
   * @param {SessionService} sessionService - Instância do serviço de sessões
   */
  constructor(io, sessionService) {
    this.io = io;
    this.sessionService = sessionService;
    this.setupEventListeners();
  }

  /**
   * Configura os listeners de eventos
   */
  setupEventListeners() {
    this.io.on('connection', (socket) => {
      console.log('Cliente conectado via WebSocket:', socket.id);

      // Quando o cliente solicita listar sessões
      socket.on('get-sessions', async () => {
        try {
          const sessions = await this.sessionService.listSessions();
          socket.emit('sessions-list', sessions);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Quando o cliente solicita criar uma nova sessão
      socket.on('create-session', async (sessionData) => {
        try {
          const result = await this.sessionService.createSession(sessionData);
          // Emitir para todos os clientes conectados que uma nova sessão foi criada
          this.io.emit('session-created', result);
          socket.emit('create-session-response', result);
        } catch (error) {
          socket.emit('create-session-error', { message: error.message });
        }
      });

      // Quando o cliente solicita remover uma sessão
      socket.on('remove-session', async (sessionId) => {
        try {
          const result = await this.sessionService.removeSession(sessionId);
          // Emitir para todos os clientes conectados que uma sessão foi removida
          this.io.emit('session-removed', { sessionId });
          socket.emit('remove-session-response', result);
        } catch (error) {
          socket.emit('remove-session-error', { message: error.message });
        }
      });

      // Quando o cliente solicita enviar uma mensagem
      socket.on('send-message', async (data) => {
        try {
          const { sessionId, number, content } = data;
          const result = await this.sessionService.sendMessage(sessionId, number, content);
          socket.emit('send-message-response', result);
        } catch (error) {
          socket.emit('send-message-error', { message: error.message });
        }
      });

      // Quando o cliente se desconecta
      socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
      });
    });
  }

  /**
   * Emite evento de QR Code para um cliente específico
   * @param {string} sessionId - ID da sessão
   * @param {string} qr - Código QR
   */
  emitQRCode(sessionId, qr) {
    this.io.emit('qr-code', { sessionId, qr });
  }

  /**
   * Emite evento de status de sessão para todos os clientes
   * @param {string} sessionId - ID da sessão
   * @param {string} status - Novo status
   */
  emitSessionStatus(sessionId, status) {
    this.io.emit('session-status', { sessionId, status });
  }

  /**
   * Emite evento de nova mensagem recebida
   * @param {Object} message - Mensagem recebida
   * @param {string} sessionId - ID da sessão
   */
  emitNewMessage(message, sessionId) {
    this.io.emit('new-message', { message, sessionId });
  }

  /**
   * Emite evento de log de mensagem
   * @param {Object} log - Log da mensagem
   */
  emitMessageLog(log) {
    this.io.emit('message-log', log);
  }
}

module.exports = SessionSocket;