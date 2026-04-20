const {
  calculateTypingDelay,
  calculateReadDelay,
  sleep
} = require('../../utils/interaction-timing');

class MessageUXService {
  constructor({ manager, sessionId } = {}) {
    this.manager = manager;
    this.sessionId = sessionId;
  }

  async sendTextWithFeedback(to, text) {
    if (!to || !text) return null;

    const readDelayMs = calculateReadDelay(1000, 3000);
    await sleep(readDelayMs);

    await this.manager.sendPresenceUpdate(this.sessionId, to, 'composing');

    const typingDelayMs = calculateTypingDelay(text, {
      msPerChar: 150,
      variance: 0.2
    });
    await sleep(typingDelayMs);

    const result = await this.manager.sendMessage(this.sessionId, to, { text });
    await this.manager.sendPresenceUpdate(this.sessionId, to, 'available');

    return {
      result,
      timing: {
        readDelayMs,
        typingDelayMs
      }
    };
  }
}

module.exports = MessageUXService;

