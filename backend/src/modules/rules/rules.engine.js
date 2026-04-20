class RulesEngine {
  constructor() {
    this.rules = [];
  }

  addRule(rule) {
    this.rules.push(rule);
  }

  removeRule(ruleId) {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  updateRule(ruleId, updates) {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      return this.rules[index];
    }
    return null;
  }

  getRules() {
    return [...this.rules];
  }

  getRule(ruleId) {
    return this.rules.find((r) => r.id === ruleId);
  }

  getEnabledRules() {
    return this.rules.filter((r) => r.enabled !== false);
  }

  evaluateRules(message) {
    const enabledRules = this.getEnabledRules();
    const triggeredRules = [];

    for (const rule of enabledRules) {
      if (this.matchTrigger(rule, message)) {
        triggeredRules.push(rule);
      }
    }

    return triggeredRules;
  }

  matchTrigger(rule, message) {
    const { trigger, triggerValue } = rule;
    if (!trigger) return false;

    if (trigger === 'message') {
      return true;
    }

    const messageText = this.extractMessageText(message).toLowerCase();
    if (!messageText) return false;

    switch (trigger) {
      case 'keyword':
        return this.matchKeyword(triggerValue, messageText);
      case 'command':
        return this.matchCommand(triggerValue, messageText);
      default:
        return false;
    }
  }

  matchKeyword(keyword, messageText) {
    if (!keyword) return false;

    const keywords = Array.isArray(keyword)
      ? keyword.map((k) => String(k).toLowerCase().trim())
      : String(keyword).toLowerCase().split(',').map((k) => k.trim());

    return keywords.some((k) => k && messageText.includes(k));
  }

  matchCommand(command, messageText) {
    if (!command) return false;

    const normalizedCommand = String(command).startsWith('!')
      ? String(command)
      : `!${String(command)}`;

    return messageText.startsWith(normalizedCommand.toLowerCase());
  }

  executeAction(rule, message) {
    const { action, actionValue } = rule;

    switch (action) {
      case 'reply':
        return {
          type: 'reply',
          content: this.parseVariables(actionValue, message)
        };
      case 'forward':
        return { type: 'forward', target: actionValue };
      case 'webhook':
        return {
          type: 'webhook',
          url: actionValue,
          data: this.formatWebhookData(rule, message)
        };
      default:
        return null;
    }
  }

  parseVariables(content, message) {
    if (!content) return '';
    const messageText = this.extractMessageText(message);

    return String(content)
      .replace(/\{\{name\}\}/g, message.pushName || 'Usuario')
      .replace(/\{\{message\}\}/g, messageText)
      .replace(/\{\{number\}\}/g, message.key?.remoteJid?.split('@')[0] || '');
  }

  extractMessageText(message) {
    const payload = message?.message || {};

    return payload.text
      || payload.conversation
      || payload.extendedTextMessage?.text
      || payload.imageMessage?.caption
      || payload.videoMessage?.caption
      || payload.buttonsResponseMessage?.selectedButtonId
      || payload.listResponseMessage?.singleSelectReply?.selectedRowId
      || payload.templateButtonReplyMessage?.selectedId
      || '';
  }

  formatWebhookData(rule, message) {
    return {
      rule: rule.name,
      trigger: rule.trigger,
      triggerValue: rule.triggerValue,
      message: this.extractMessageText(message),
      sender: message.pushName,
      senderNumber: message.key?.remoteJid,
      timestamp: message.timestamp,
      sessionId: message.sessionId
    };
  }
}

module.exports = RulesEngine;
