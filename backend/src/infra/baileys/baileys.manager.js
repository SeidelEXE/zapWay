const BaileysClient = require('./baileys.client')

class BaileysManager {
  constructor() {
    this.sessions = new Map()
  }

  createSession(sessionId, callbacks = {}) {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Sessão ${sessionId} já existe`)
    }

    const client = new BaileysClient(sessionId, callbacks)
    this.sessions.set(sessionId, client)
    return client
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null
  }

  removeSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.disconnect()
      this.sessions.delete(sessionId)
      return true
    }
    return false
  }

  listSessions() {
    return Array.from(this.sessions.keys())
  }

  hasSession(sessionId) {
    return this.sessions.has(sessionId)
  }

  async connectSession(sessionId) {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    await session.connect()
  }

  async disconnectSession(sessionId) {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    await session.disconnect()
  }

  async sendMessage(sessionId, number, content) {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    if (!session.isConnected()) {
      throw new Error(`Sessão ${sessionId} não está conectada`)
    }

    return session.sendMessage(number, content)
  }

  async sendPresenceUpdate(sessionId, jid, presence) {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`)
    }

    if (!session.isConnected()) {
      throw new Error(`Sessão ${sessionId} não está conectada`)
    }

    return session.sendPresenceUpdate(presence, jid)
  }

  getSessionsStatus() {
    return Array.from(this.sessions.entries()).map(([sessionId, client]) => ({
      sessionId,
      isConnected: client.isConnected()
    }))
  }
}

module.exports = BaileysManager
