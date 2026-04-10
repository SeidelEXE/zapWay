/**
 * ============================================
 * ARQUIVO: modules/sessions/session.service.js
 * ============================================
 * Serviço principal para gerenciamento de sessões WhatsApp.
 * Orquestra a criação, conexão e comunicação com o Baileys.
 * Armazena estado das sessões em memória (Map).
 */

const { v4: uuidv4 } = require('uuid');

// Importação do gerenciador Baileys (infraestrutura de baixo nível)
const BaileysManager = require('../../infra/baileys/baileys.manager');

class SessionService {
  /**
   * Construtor do serviço de sessões.
   * Inicializa o gerenciador Baileys e mapas de estado.
   */
  constructor() {
    // Instância do gerenciador Baileys para operações de baixo nível
    this.baileysManager = new BaileysManager();

    // Mapa em memória para armazenar dados das sessões
    // Key: sessionId, Value: objeto com dados da sessão
    this.sessions = new Map();

    // Referência para o módulo WebSocket (injetada posteriormente)
    this.sessionSocket = null;

    // Referência para o listener de mensagens (injetada posteriormente)
    this.messageListener = null;
  }

  /**
   * Define o listener de mensagens para processar mensagens recebidas.
   * Chamado pelo app.js após criar todas as instâncias.
   * 
   * @param {MessageListener} messageListener - Instância do listener
   */
  setMessageListener(messageListener) {
    this.messageListener = messageListener;
  }

  /**
   * Cria uma nova sessão WhatsApp.
   * Inicializa o cliente Baileys e inicia a conexão.
   * 
   * @param {Object} sessionData - Dados da sessão
   * @param {string} [sessionData.sessionId] - ID personalizado (gerado se não informado)
   * @param {string} [sessionData.name] - Nome amigável da sessão
   * @returns {Object} Dados da sessão criada
   */
  async createSession(sessionData = {}) {
    // Gera ID único se não fornecido (formato: session_xxxxxxxx)
    const sessionId = sessionData.sessionId || `session_${uuidv4().slice(0, 8)}`;

    // Verifica se já existe sessão com esse ID
    if (this.baileysManager.hasSession(sessionId)) {
      throw new Error(`Sessão ${sessionId} já existe`);
    }

    // Cria objeto com dados da sessão
    const session = {
      id: sessionId,
      name: sessionData.name || sessionId, // Nome amigável
      status: 'connecting', // Status inicial
      createdAt: new Date(), // Data de criação
      phone: null // Número WhatsApp (definido após conexão)
    };

    // Armazena dados da sessão em memória
    this.sessions.set(sessionId, session);

    // Cria sessão no Baileys com callbacks para eventos
    this.baileysManager.createSession(sessionId, {
      // Callback: QR Code gerado (usuário precisa escanear)
      onQR: (qr) => {
        this.emitQRCode(sessionId, qr);
      },

      // Callback: Conexão estabelecida com sucesso
      onConnected: () => {
        this.updateSessionStatus(sessionId, 'connected');
        this.emitSessionStatus(sessionId, 'connected');
      },

      // Callback: Desconexão (pode ser intencional ou erro)
      onDisconnected: (sid, error) => {
        this.updateSessionStatus(sessionId, 'disconnected');
        this.emitSessionStatus(sessionId, 'disconnected');
      },

      // Callback: Nova mensagem recebida
      onMessage: (message) => {
        this.handleIncomingMessage(message, sessionId);
      },

      // Callback: Erro na sessão
      onError: (error) => {
        console.error(`Erro na sessão ${sessionId}:`, error);
        this.updateSessionStatus(sessionId, 'error');
      }
    });

    // Inicia a conexão com WhatsApp
    await this.baileysManager.connectSession(sessionId);

    // Retorna confirmação (QR será enviado via WebSocket)
    return {
      id: sessionId,
      status: 'connecting',
      message: 'Sessão criada, aguardando QR Code'
    };
  }

  /**
   * Remove uma sessão existente.
   * Desconecta e remove todos os dados associados.
   * 
   * @param {string} sessionId - ID da sessão a remover
   * @returns {Object} Confirmação da remoção
   */
  async removeSession(sessionId) {
    // Verifica se a sessão existe
    if (!this.baileysManager.hasSession(sessionId)) {
      throw new Error(`Sessão ${sessionId} não encontrada`);
    }

    // Remove do gerenciador Baileys (desconecta se conectada)
    this.baileysManager.removeSession(sessionId);

    // Remove dados da sessão do mapa em memória
    this.sessions.delete(sessionId);

    // Notifica via WebSocket que sessão foi removida
    this.emitSessionStatus(sessionId, 'removed');

    return { success: true, sessionId, message: 'Sessão removida' };
  }

  /**
   * Lista todas as sessões ativas com status atual.
   * 
   * @returns {Array} Lista de sessões com dados e status
   */
  async listSessions() {
    const sessions = [];

    // Itera sobre todas as sessões armazenadas
    for (const [sessionId, session] of this.sessions) {
      // Obtém cliente Baileys para verificar conexão real
      const baileysSession = this.baileysManager.getSession(sessionId);
      const isConnected = baileysSession?.isConnected() || false;

      // Adiciona sessão com status atualizado
      sessions.push({
        ...session,
        // Sobrescreve status com base na conexão real
        status: isConnected ? 'connected' : session.status
      });
    }

    return sessions;
  }

  /**
   * Obtém dados de uma sessão específica.
   * 
   * @param {string} sessionId - ID da sessão
   * @returns {Object} Dados da sessão
   */
  async getSession(sessionId) {
    // Busca sessão no mapa
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`);
    }

    // Verifica status real de conexão
    const baileysSession = this.baileysManager.getSession(sessionId);
    const isConnected = baileysSession?.isConnected() || false;

    return {
      ...session,
      status: isConnected ? 'connected' : session.status
    };
  }

  /**
   * Reconecta uma sessão que está desconectada.
   * Útil para recuperação automática após perda de conexão.
   * 
   * @param {string} sessionId - ID da sessão
   * @returns {Object} Status da reconexão
   */
  async reconnectSession(sessionId) {
    if (!this.baileysManager.hasSession(sessionId)) {
      throw new Error(`Sessão ${sessionId} não encontrada`);
    }

    // Tenta reconectar
    await this.baileysManager.connectSession(sessionId);
    this.updateSessionStatus(sessionId, 'connecting');

    return { success: true, sessionId, message: 'Reconectando...' };
  }

  /**
   * Envia uma mensagem de texto via WhatsApp.
   * 
   * @param {string} sessionId - ID da sessão
   * @param {string} number - Número do destinatário
   * @param {string} content - Texto da mensagem
   * @returns {Object} Resultado do envio com messageId
   */
  async sendMessage(sessionId, number, content) {
    try {
      // Encaminha para o gerenciador Baileys
      const result = await this.baileysManager.sendMessage(
        sessionId,
        number,
        { text: content }
      );

      return {
        success: true,
        messageId: result?.key?.id // ID da mensagem enviada
      };
    } catch (error) {
      throw new Error(`Erro ao enviar mensagem: ${error.message}`);
    }
  }

  /**
   * Atualiza o status de uma sessão no mapa em memória.
   * 
   * @param {string} sessionId - ID da sessão
   * @param {string} status - Novo status
   */
  updateSessionStatus(sessionId, status) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.updatedAt = new Date();
    }
  }

  /**
   * Emite evento de QR Code via WebSocket.
   * O frontend usa isso para exibir o QR Code ao usuário.
   * 
   * @param {string} sessionId - ID da sessão
   * @param {string} qr - QR Code em formato de texto/imagem
   */
  emitQRCode(sessionId, qr) {
    if (this.sessionSocket?.emitQRCode) {
      this.sessionSocket.emitQRCode(sessionId, qr);
    }
  }

  /**
   * Emite evento de mudança de status via WebSocket.
   * Notifica o frontend sobre alterações na conexão.
   * 
   * @param {string} sessionId - ID da sessão
   * @param {string} status - Novo status
   */
  emitSessionStatus(sessionId, status) {
    if (this.sessionSocket?.emitSessionStatus) {
      this.sessionSocket.emitSessionStatus(sessionId, status);
    }
  }

  /**
   * Processa mensagem recebida do WhatsApp.
   * Encaminha para WebSocket e para o motor de regras.
   * 
   * @param {Object} message - Dados da mensagem
   * @param {string} sessionId - ID da sessão origem
   */
  async handleIncomingMessage(message, sessionId) {
    // Emite para WebSocket (frontend pode exibir em tempo real)
    if (this.sessionSocket?.emitNewMessage) {
      this.sessionSocket.emitNewMessage(message, sessionId);
    }

    // Encaminha para listener processar regras de automação
    if (this.messageListener?.handleMessage) {
      await this.messageListener.handleMessage(message, sessionId);
    }
  }
}

module.exports = SessionService;
