const { query } = require('../../config/db')

function toDbTrigger(trigger) {
  return {
    keyword: 'CONTAINS',
    message: 'CONTAINS',
    command: 'STARTS_WITH',
    equals: 'EQUALS',
    contains: 'CONTAINS',
    starts_with: 'STARTS_WITH',
    regex: 'REGEX'
  }[String(trigger || '').toLowerCase()] || 'CONTAINS'
}

function toApiRule(row) {
  const trigger = {
    EQUALS: 'keyword',
    CONTAINS: 'keyword',
    STARTS_WITH: 'command',
    REGEX: 'keyword'
  }[row.trigger_type] || 'keyword'

  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    trigger,
    triggerType: row.trigger_type,
    triggerValue: row.trigger_value,
    action: 'reply',
    actionValue: row.response_value,
    enabled: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

class RulesService {
  constructor({ rulesEngine } = {}) {
    this.rulesEngine = rulesEngine
  }

  async loadRules() {
    const result = await query(
      `SELECT id, session_id, name, trigger_type, trigger_value,
              response_value, is_active, created_at, updated_at
       FROM rules
       WHERE is_active = TRUE
       ORDER BY id`
    )

    for (const row of result.rows) {
      this.rulesEngine?.addRule(toApiRule(row))
    }

    return result.rows.map(toApiRule)
  }

  async createRule(ruleData = {}) {
    if (!ruleData.name?.trim()) throw new Error('Nome da regra é obrigatório')
    if (!ruleData.triggerValue?.trim()) throw new Error('Valor do gatilho é obrigatório')
    if (!ruleData.actionValue?.trim()) throw new Error('Resposta da regra é obrigatória')

    const result = await query(
      `INSERT INTO rules
        (session_id, name, trigger_type, trigger_value, response_value, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, session_id, name, trigger_type, trigger_value,
                 response_value, is_active, created_at, updated_at`,
      [
        ruleData.sessionId || null,
        ruleData.name.trim(),
        toDbTrigger(ruleData.trigger),
        ruleData.triggerValue.trim(),
        ruleData.actionValue.trim(),
        ruleData.enabled !== false
      ]
    )

    const rule = toApiRule(result.rows[0])
    if (rule.enabled) this.rulesEngine?.addRule(rule)
    return rule
  }

  async getRules() {
    const result = await query(
      `SELECT id, session_id, name, trigger_type, trigger_value,
              response_value, is_active, created_at, updated_at
       FROM rules
       ORDER BY id DESC`
    )
    return result.rows.map(toApiRule)
  }

  async getRule(ruleId) {
    const result = await query(
      `SELECT id, session_id, name, trigger_type, trigger_value,
              response_value, is_active, created_at, updated_at
       FROM rules WHERE id = $1`,
      [ruleId]
    )
    return result.rowCount ? toApiRule(result.rows[0]) : null
  }

  async updateRule(ruleId, updates = {}) {
    const current = await this.getRule(ruleId)
    if (!current) throw new Error(`Regra ${ruleId} não encontrada`)

    const result = await query(
      `UPDATE rules
       SET name = $2,
           trigger_type = $3,
           trigger_value = $4,
           response_value = $5,
           is_active = $6,
           session_id = $7
       WHERE id = $1
       RETURNING id, session_id, name, trigger_type, trigger_value,
                 response_value, is_active, created_at, updated_at`,
      [
        ruleId,
        updates.name?.trim() || current.name,
        toDbTrigger(updates.trigger || current.trigger),
        updates.triggerValue?.trim() || current.triggerValue,
        updates.actionValue?.trim() || current.actionValue,
        updates.enabled ?? current.enabled,
        updates.sessionId ?? current.sessionId ?? null
      ]
    )

    const rule = toApiRule(result.rows[0])
    this.rulesEngine?.removeRule(rule.id)
    if (rule.enabled) this.rulesEngine?.addRule(rule)
    return rule
  }

  async deleteRule(ruleId) {
    const result = await query('DELETE FROM rules WHERE id = $1 RETURNING id', [ruleId])
    if (!result.rowCount) throw new Error(`Regra ${ruleId} não encontrada`)
    this.rulesEngine?.removeRule(Number(ruleId))
    return { success: true, id: Number(ruleId) }
  }

  async toggleRule(ruleId) {
    const result = await query(
      `UPDATE rules
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, session_id, name, trigger_type, trigger_value,
                 response_value, is_active, created_at, updated_at`,
      [ruleId]
    )
    if (!result.rowCount) throw new Error(`Regra ${ruleId} não encontrada`)

    const rule = toApiRule(result.rows[0])
    this.rulesEngine?.removeRule(rule.id)
    if (rule.enabled) this.rulesEngine?.addRule(rule)
    return rule
  }

  async processMessage(message, sessionId) {
    if (!this.rulesEngine) return []
    const triggeredRules = this.rulesEngine.evaluateRules(message, sessionId)
    return triggeredRules.map((rule) => ({
      rule,
      action: this.rulesEngine.executeAction(rule, message, { sessionId })
    })).filter((result) => result.action)
  }
}

module.exports = RulesService
