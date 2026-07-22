const {
  BufferJSON,
  initAuthCreds,
  proto
} = require('@whiskeysockets/baileys')

const { pool } = require('../../config/db')

function serialize(value) {
  return JSON.stringify(value, BufferJSON.replacer)
}

function revive(value) {
  if (value === null || value === undefined) return value
  return JSON.parse(JSON.stringify(value), BufferJSON.reviver)
}

async function ensureSession(sessionId) {
  await pool.query(
    `INSERT INTO sessions (id, status)
     VALUES ($1, 'DISCONNECTED')
     ON CONFLICT (id) DO NOTHING`,
    [sessionId]
  )
}

/**
 * Cria o estado de autenticação persistido no PostgreSQL para uma sessão Baileys.
 * Os JSONs antigos não são consultados: uma sessão sem estado inicia com creds novas.
 *
 * @param {string} sessionId
 * @returns {Promise<{state: object, saveCreds: Function, clear: Function}>}
 */
async function createPostgresAuthState(sessionId) {
  if (!sessionId) throw new Error('sessionId é obrigatório para o auth state')

  await ensureSession(sessionId)

  const credsResult = await pool.query(
    'SELECT creds FROM baileys_creds WHERE session_id = $1',
    [sessionId]
  )

  const creds = credsResult.rowCount
    ? revive(credsResult.rows[0].creds)
    : initAuthCreds()

  if (!credsResult.rowCount) {
    await pool.query(
      `INSERT INTO baileys_creds (session_id, creds)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (session_id) DO NOTHING`,
      [sessionId, serialize(creds)]
    )
  }

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        if (!Array.isArray(ids) || ids.length === 0) return {}

        const result = Object.fromEntries(ids.map((id) => [id, null]))
        const query = `
          SELECT key_id, value
          FROM baileys_keys
          WHERE session_id = $1
            AND type = $2
            AND key_id = ANY($3::text[])
        `
        const dbResult = await pool.query(query, [sessionId, type, ids])

        for (const row of dbResult.rows) {
          let value = revive(row.value)
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value)
          }
          result[row.key_id] = value
        }

        return result
      },

      set: async (data) => {
        if (!data || typeof data !== 'object') return

        const client = await pool.connect()
        try {
          await client.query('BEGIN')

          for (const [type, entries] of Object.entries(data)) {
            for (const [keyId, value] of Object.entries(entries || {})) {
              if (value) {
                await client.query(
                  `INSERT INTO baileys_keys (session_id, type, key_id, value)
                   VALUES ($1, $2, $3, $4::jsonb)
                   ON CONFLICT (session_id, type, key_id)
                   DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                  [sessionId, type, keyId, serialize(value)]
                )
              } else {
                await client.query(
                  `DELETE FROM baileys_keys
                   WHERE session_id = $1 AND type = $2 AND key_id = $3`,
                  [sessionId, type, keyId]
                )
              }
            }
          }

          await client.query('COMMIT')
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        } finally {
          client.release()
        }
      }
    }
  }

  const saveCreds = async () => {
    await pool.query(
      `INSERT INTO baileys_creds (session_id, creds)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (session_id)
       DO UPDATE SET creds = EXCLUDED.creds, updated_at = NOW()`,
      [sessionId, serialize(creds)]
    )
  }

  const clear = async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM baileys_keys WHERE session_id = $1', [sessionId])
      await client.query('DELETE FROM baileys_creds WHERE session_id = $1', [sessionId])
      await client.query(
        `UPDATE sessions
         SET status = 'DISCONNECTED', qr_code = NULL, phone = NULL,
             last_disconnected_at = NOW()
         WHERE id = $1`,
        [sessionId]
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  return { state, saveCreds, clear }
}

module.exports = createPostgresAuthState
