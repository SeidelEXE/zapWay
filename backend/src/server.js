const buildApp = require('./app');
const { startTerminalMode } = require('./terminal');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    const isTerminalMode = process.argv.includes('--terminal') || process.env.APP_MODE === 'terminal';

    if (isTerminalMode) {
      console.log('Iniciando em modo terminal (sessao unica)...');
      await startTerminalMode();
      return;
    }

    const app = await buildApp();
    await app.listen({ port: PORT, host: '0.0.0.0' });

    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`WebSocket disponivel em ws://localhost:${PORT}/ws/sessions`);
  } catch (err) {
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
  }
}

start();
