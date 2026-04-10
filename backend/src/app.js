/**
 * ============================================
 * ARQUIVO: app.js
 * ============================================
 * Configuração principal da aplicação Fastify.
 * Responsável por registrar plugins, serviços e rotas.
 */

// Importação do framework Fastify com logger habilitado
const fastify = require('fastify')({ logger: true });

// Plugin Fastify para CORS (Cross-Origin Resource Sharing)
// Permite que o frontend faça requisições de outros domínios
const cors = require('@fastify/cors');

// Plugin Fastify para suporte a WebSocket
const websocket = require('@fastify/websocket');

// ============================================
// IMPORTAÇÃO DOS MÓDULOS
// ============================================

// Módulo de sessões - gerencia conexões WhatsApp
const SessionService = require('./modules/sessions/session.service');

// Módulo de socket - comunicação em tempo real via WebSocket
const SessionSocket = require('./modules/sessions/session.socket');

// Motor de regras - avalia e executa regras de automação
const RulesEngine = require('./modules/rules/rules.engine');

// Serviço de regras - CRUD e processamento de regras
const RulesService = require('./modules/rules/rules.service');

// Controller de regras - manipula requisições HTTP de regras
const RulesController = require('./modules/rules/rules.controller');

// Serviço de mensagens - armazenamento e processamento de mensagens
const MessageService = require('./modules/messages/message.service');

// Listener de mensagens - escuta e processa mensagens recebidas
const MessageListener = require('./modules/messages/message.listener');

// Rotas REST
const sessionsRoutes = require('./routes/sessions.routes');
const rulesRoutes = require('./routes/rules.routes');
const messagesRoutes = require('./routes/messages.routes');

/**
 * Função que constrói e configura a aplicação Fastify.
 * Retorna a instância configurada para uso no server.js.
 */
async function buildApp() {
  // ============================================
  // REGISTRO DE PLUGINS
  // ============================================

  // Habilita CORS para todas as origens (para desenvolvimento)
  // Em produção, é recomendado especificar origens permitidas
  await fastify.register(cors, { origin: true });

  // Registra plugin de WebSocket para comunicação em tempo real
  await fastify.register(websocket);

  // ============================================
  // INSTANCIAÇÃO DOS SERVIÇOS
  // ============================================

  // Cria instância do motor de regras primeiro (dependência)
  const rulesEngine = new RulesEngine();

  // Cria serviço de regras passando o motor como dependência
  const rulesService = new RulesService({ rulesEngine });

  // Cria controller de regras para tratar requisições HTTP
  const rulesController = new RulesController({ rulesService });

  // Cria serviço de mensagens passando o serviço de regras
  // Isso permite que mensagens dispararem regras de automação
  const messageService = new MessageService({ rulesService });

  // Cria listener de mensagens para processar mensagens recebidas
  const messageListener = new MessageListener({ messageService });

  // Cria serviço de sessões (gerencia conexões WhatsApp)
  const sessionService = new SessionService();

  // Cria WebSocket para enviar eventos em tempo real
  const sessionSocket = new SessionSocket(fastify, sessionService);

  // ============================================
  // INJEÇÃO DE DEPENDÊNCIAS
  // ============================================

  // Passa referência do socket para o serviço de sessões
  // Permite que o serviço emita eventos via WebSocket
  sessionService.sessionSocket = sessionSocket;

  // Passa referência do listener para processar mensagens
  sessionService.setMessageListener(messageListener);

  // ============================================
  // REGISTRO DE ROTAS
  // ============================================

  // Registra rotas de sessões com prefixo /api/sessions
  await fastify.register(sessionsRoutes, {
    prefix: '/api/sessions',
    sessionService
  });

  // Registra rotas de regras com prefixo /api/rules
  await fastify.register(rulesRoutes, {
    prefix: '/api/rules',
    rulesController
  });

  // Registra rotas de mensagens com prefixo /api/messages
  await fastify.register(messagesRoutes, {
    prefix: '/api/messages',
    messageService
  });

  // ============================================
  // ROTA DE HEALTH CHECK
  // ============================================

  // Rota simples para verificar se o servidor está online
  fastify.get('/api/health', async () => ({ status: 'ok' }));

  // Retorna a instância do Fastify configurada
  return fastify;
}

// Exporta a função de construção para uso no server.js
module.exports = buildApp;
