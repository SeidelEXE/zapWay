const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

const BaileysManager = require('./infra/baileys/baileys.manager');
const RulesEngine = require('./modules/rules/rules.engine');
const MessageUXService = require('./modules/messages/message.ux');

const DEFAULT_SESSION_ID = process.env.WHATSAPP_SESSION_ID || 'main';
const DEFAULT_RULES_PATH = process.env.AUTO_REPLIES_FILE || path.join(process.cwd(), 'config', 'auto-replies.json');
const DEFAULT_STATE_PATH = process.env.TERMINAL_SESSION_FILE || path.join(process.cwd(), 'config', 'terminal-session.json');
const DEFAULT_AUTH_FILE_PATH = process.env.WHATSAPP_AUTH_FILE || DEFAULT_STATE_PATH;

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function nowIso() {
  return new Date().toISOString();
}

function hasPersistedAuth(authFilePath) {
  if (!fs.existsSync(authFilePath)) return false;

  try {
    const parsed = JSON.parse(fs.readFileSync(authFilePath, 'utf8'));
    const me = parsed?.auth?.creds?.me;
    return Boolean(me?.id || me?.lid);
  } catch {
    return false;
  }
}

function createDefaultSessionState(sessionId) {
  return {
    sessionId,
    authFile: path.relative(process.cwd(), DEFAULT_AUTH_FILE_PATH).replace(/\\/g, '/'),
    autoRepliesFile: path.relative(process.cwd(), DEFAULT_RULES_PATH).replace(/\\/g, '/'),
    isLoggedIn: false,
    hasAuthFiles: false,
    lastStartAt: null,
    lastQrAt: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    lastDisconnectReason: null
  };
}

function loadSessionState(filePath, sessionId) {
  ensureDirForFile(filePath);

  if (!fs.existsSync(filePath)) {
    const initial = createDefaultSessionState(sessionId);
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return {
      ...createDefaultSessionState(sessionId),
      ...parsed,
      sessionId
    };
  } catch {
    const fallback = createDefaultSessionState(sessionId);
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function persistSessionState(filePath, state, patch = {}) {
  let diskState = {};
  try {
    if (fs.existsSync(filePath)) {
      diskState = JSON.parse(fs.readFileSync(filePath, 'utf8')) || {};
    }
  } catch {
    diskState = {};
  }

  const next = {
    ...diskState,
    ...state,
    ...patch
  };

  fs.writeFileSync(filePath, JSON.stringify(next, null, 2));
  return next;
}

function loadRulesFromJson(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Arquivo de regras nao encontrado: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(content);

  const rawRules = Array.isArray(parsed) ? parsed : (parsed.rules || []);
  const defaultReply = Array.isArray(parsed) ? null : (parsed.defaultReply || null);

  const normalizedRules = rawRules.map((rule, index) => ({
    id: rule.id || `json_rule_${index + 1}`,
    name: rule.name || `Regra ${index + 1}`,
    trigger: rule.trigger || 'keyword',
    triggerValue: rule.triggerValue || '',
    action: rule.action || 'reply',
    actionValue: rule.actionValue || rule.reply || '',
    enabled: rule.enabled !== false
  }));

  return { normalizedRules, defaultReply, absolutePath };
}

function printQrCode(qrText) {
  console.log('\nEscaneie o QR Code abaixo no WhatsApp:');
  qrcode.generate(qrText, { small: true });
  console.log('');
}

function getIncomingText(rulesEngine, message) {
  return rulesEngine.extractMessageText(message).trim();
}

function isPrivateContactJid(jid) {
  if (!jid || typeof jid !== 'string') return false;
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
}

async function startTerminalMode() {
  const rulesEngine = new RulesEngine();
  const { normalizedRules, defaultReply, absolutePath } = loadRulesFromJson(DEFAULT_RULES_PATH);

  for (const rule of normalizedRules) {
    rulesEngine.addRule(rule);
  }

  const sessionId = DEFAULT_SESSION_ID;
  const statePath = DEFAULT_STATE_PATH;
  let sessionState = loadSessionState(statePath, sessionId);

  sessionState = persistSessionState(statePath, sessionState, {
    authFile: path.relative(process.cwd(), DEFAULT_AUTH_FILE_PATH).replace(/\\/g, '/'),
    autoRepliesFile: path.relative(process.cwd(), absolutePath).replace(/\\/g, '/'),
    hasAuthFiles: hasPersistedAuth(DEFAULT_AUTH_FILE_PATH),
    lastStartAt: nowIso()
  });

  if (!sessionState.hasAuthFiles) {
    console.log('Nenhuma autenticacao encontrada para a sessao atual. QR Code sera exibido para login.');
  } else {
    console.log('Autenticacao encontrada. Tentando subir sessao sem solicitar novo QR.');
  }

  const manager = new BaileysManager();
  const messageUX = new MessageUXService({ manager, sessionId });

  manager.createSession(sessionId, {
    onQR: (qr) => {
      printQrCode(qr);
      sessionState = persistSessionState(statePath, sessionState, {
        isLoggedIn: false,
        hasAuthFiles: hasPersistedAuth(DEFAULT_AUTH_FILE_PATH),
        lastQrAt: nowIso()
      });
    },
    onConnected: () => {
      console.log(`Sessao '${sessionId}' conectada.`);
      console.log(`Regras carregadas: ${normalizedRules.length} (${absolutePath})`);

      sessionState = persistSessionState(statePath, sessionState, {
        isLoggedIn: true,
        hasAuthFiles: hasPersistedAuth(DEFAULT_AUTH_FILE_PATH),
        lastConnectedAt: nowIso(),
        lastDisconnectReason: null
      });
    },
    onDisconnected: (_sessionId, error) => {
      const reason = error?.message || 'desconectado';
      console.log(`Sessao desconectada: ${reason}`);

      sessionState = persistSessionState(statePath, sessionState, {
        isLoggedIn: false,
        hasAuthFiles: hasPersistedAuth(DEFAULT_AUTH_FILE_PATH),
        lastDisconnectedAt: nowIso(),
        lastDisconnectReason: reason
      });
    },
    onError: (error) => {
      console.error('Erro no cliente WhatsApp:', error?.message || error);
    },
    onMessage: async (message) => {
      try {
        const incomingText = getIncomingText(rulesEngine, message);
        const from = message?.key?.remoteJid;

        if (!from) return;
        if (!isPrivateContactJid(from)) {
          console.log(`Mensagem ignorada (nao privado): ${from}`);
          return;
        }

        console.log(`Mensagem recebida de ${from}: ${incomingText || '[sem texto]'}`);

        const triggeredRules = rulesEngine.evaluateRules(message, sessionId);

        if (triggeredRules.length === 0) {
          if (defaultReply && incomingText) {
            const parsedDefault = rulesEngine.parseVariables(defaultReply, message);
            const uxResult = await messageUX.sendTextWithFeedback(from, parsedDefault);
            if (uxResult?.timing) {
              console.log(`Resposta default enviada para ${from} (read=${uxResult.timing.readDelayMs}ms, typing=${uxResult.timing.typingDelayMs}ms)`);
            }
          }
          return;
        }

        for (const rule of triggeredRules) {
          const action = rulesEngine.executeAction(rule, message, { sessionId: sessionId });
          if (!action || action.type !== 'reply' || !action.content) continue;

          const uxResult = await messageUX.sendTextWithFeedback(from, action.content);
          if (uxResult?.timing) {
            console.log(`Regra acionada: ${rule.name} -> resposta enviada (read=${uxResult.timing.readDelayMs}ms, typing=${uxResult.timing.typingDelayMs}ms)`);
          }
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error?.message || error);
      }
    }
  });

  await manager.connectSession(sessionId);

  const shutdown = async () => {
    console.log('\nEncerrando sessao...');
    sessionState = persistSessionState(statePath, sessionState, {
      isLoggedIn: false,
      hasAuthFiles: hasPersistedAuth(DEFAULT_AUTH_FILE_PATH)
    });

    try {
      manager.removeSession(sessionId);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { startTerminalMode };
