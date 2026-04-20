const fs = require('fs');
const path = require('path');
const {
  BufferJSON,
  initAuthCreds,
  proto
} = require('@whiskeysockets/baileys');

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readContainer(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw, BufferJSON.reviver) || {};
  } catch {
    return {};
  }
}

function extractAuth(container) {
  const auth = container?.auth || container;
  return {
    creds: auth?.creds || initAuthCreds(),
    keys: auth?.keys || {}
  };
}

function createJsonAuthState(filePath) {
  ensureDirForFile(filePath);

  const container = readContainer(filePath);
  const data = extractAuth(container);

  const persist = () => {
    const current = readContainer(filePath);
    const next = {
      ...current,
      auth: data
    };

    fs.writeFileSync(filePath, JSON.stringify(next, BufferJSON.replacer, 2));
  };

  const state = {
    creds: data.creds,
    keys: {
      get: async (type, ids) => {
        const keyStore = data.keys[type] || {};
        const result = {};

        for (const id of ids) {
          let value = keyStore[id];

          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }

          result[id] = value;
        }

        return result;
      },
      set: async (nextData) => {
        for (const type of Object.keys(nextData)) {
          data.keys[type] = data.keys[type] || {};

          for (const id of Object.keys(nextData[type])) {
            const value = nextData[type][id];
            if (value) {
              data.keys[type][id] = value;
            } else {
              delete data.keys[type][id];
            }
          }
        }

        persist();
      }
    }
  };

  const saveCreds = async () => {
    persist();
  };

  const clear = () => {
    const current = readContainer(filePath);
    const next = {
      ...current,
      auth: {
        creds: initAuthCreds(),
        keys: {}
      }
    };
    fs.writeFileSync(filePath, JSON.stringify(next, BufferJSON.replacer, 2));
  };

  return { state, saveCreds, clear };
}

module.exports = createJsonAuthState;
