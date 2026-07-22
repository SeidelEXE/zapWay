const { query } = require('../../config/db')

function normalizeTimestamp(value) {
  if (value && typeof value === 'object' && Number.isFinite(value.low)) {
    return new Date(Number(value.low) * 1000)
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric < 100000000000 ? numeric * 1000 : numeric)
    : new Date()
}

class MessageService {
  constructor({ rulesService } = {}) {
    this.rulesService = rulesService
  }

  extractMessageText(message) {
    const payload = message?.message || {}
    return payload.text
      || payload.conversation
      || payload.extendedTextMessage?.text
      || payload.imageMessage?.caption
      || payload.videoMessage?.caption
      || payload.buttonsResponseMessage?.selectedButtonId
      || payload.listResponseMessage?.singleSelectReply?.selectedRowId
      || payload.templateButtonReplyMessage?.selectedId
      || ''
  }

  async saveMessage(message, sessionId) {
    const messageId = String(message.key?.id || `${Date.now()}-${Math.random()}`)
    const occurredAt = normalizeTimestamp(message.timestamp)
    const formattedMessage = {
      id: messageId,
      sessionId,
      from: message.key?.remoteJid || null,
      fromMe: Boolean(message.key?.fromMe),
      text: this.extractMessageText(message),
      pushName: message.pushName || 'Unknown',
      timestamp: occurredAt.toISOString(),
      receivedAt: occurredAt.toISOString()
    }

    await query(
      `INSERT INTO message_logs
        (session_id, message_id, remote_jid, push_name, content, from_me, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (session_id, message_id) DO NOTHING`,
      [
        sessionId,
        messageId,
        formattedMessage.from || 'unknown',
        formattedMessage.pushName,
        formattedMessage.text,
        formattedMessage.fromMe,
        occurredAt
      ]
    )

    return formattedMessage
  }

  async getMessages(sessionId, { limit = 50, offset = 0 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500)
    const safeOffset = Math.max(Number(offset) || 0, 0)
    const result = await query(
      `SELECT message_id AS id, session_id, remote_jid AS "from",
              push_name, content AS text, from_me AS "fromMe", occurred_at,
              occurred_at AS "receivedAt"
       FROM message_logs
       WHERE session_id = $1
       ORDER BY occurred_at ASC
       LIMIT $2 OFFSET $3`,
      [sessionId, safeLimit, safeOffset]
    )
    return result.rows
  }

  async getMessageById(sessionId, messageId) {
    const result = await query(
      `SELECT message_id AS id, session_id, remote_jid AS "from",
              push_name, content AS text, from_me AS "fromMe", occurred_at,
              occurred_at AS "receivedAt"
       FROM message_logs
       WHERE session_id = $1 AND message_id = $2`,
      [sessionId, messageId]
    )
    return result.rowCount ? result.rows[0] : null
  }

  async deleteMessage(sessionId, messageId) {
    const result = await query(
      'DELETE FROM message_logs WHERE session_id = $1 AND message_id = $2 RETURNING message_id',
      [sessionId, messageId]
    )
    return result.rowCount > 0
  }

  async processIncomingMessage(message, sessionId) {
    await this.saveMessage(message, sessionId)
    return this.rulesService
      ? this.rulesService.processMessage(message, sessionId)
      : []
  }

  async getAllLogs({ limit = 100 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500)
    const result = await query(
      `SELECT message_id AS id, session_id AS session,
              remote_jid AS "from", push_name, content AS text,
              from_me AS "fromMe", occurred_at AS timestamp,
              occurred_at AS "receivedAt"
       FROM message_logs
       ORDER BY occurred_at DESC
       LIMIT $1`,
      [safeLimit]
    )
    return result.rows
  }

  async getStats() {
    const result = await query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE from_me = FALSE)::int AS received,
              COUNT(*) FILTER (WHERE from_me = TRUE)::int AS sent
       FROM message_logs`
    )
    return result.rows[0]
  }

  clearSession() {
    // A sessão removida usa ON DELETE CASCADE no banco.
  }
}

module.exports = MessageService
