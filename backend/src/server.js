/**
 * ============================================
 * ARQUIVO: server.js
 * ============================================
 * Ponto de entrada principal do servidor.
 * Responsável por iniciar a aplicação Fastify.
 */

const buildApp = require('./app');

// Porta do servidor (usa variável de ambiente ou padrão 3001)
const PORT = process.env.PORT || 3001;

/**
 * Função assíncrona para iniciar o servidor.
 * Constrói a aplicação e inicia o listening.
 */
async function start() {
  try {
    // Constrói a aplicação Fastify com todas as rotas e plugins
    const app = await buildApp();

    // Inicia o servidor ouvindo na porta e host especificados
    // 0.0.0.0 permite conexões de qualquer interface de rede
    await app.listen({ port: PORT, host: '0.0.0.0' });

    // Logs informativos no console
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📡 WebSocket disponível em ws://localhost:${PORT}/ws/sessions`);
  } catch (err) {
    // Em caso de erro, exibe mensagem e encerra o processo com código de erro
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
  }
}

// Executa a função de início
start();
