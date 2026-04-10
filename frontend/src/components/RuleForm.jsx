import { useState } from 'react';

const TRIGGER_OPTIONS = [
  { value: 'message', label: 'Mensagem recebida' },
  { value: 'keyword', label: 'Palavra-chave' },
  { value: 'command', label: 'Comando' }
];

const ACTION_OPTIONS = [
  { value: 'reply', label: 'Responder' },
  { value: 'forward', label: 'Encaminhar' },
  { value: 'webhook', label: 'Webhook' }
];

export default function RuleForm({ rule, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    trigger: rule?.trigger || 'message',
    triggerValue: rule?.triggerValue || '',
    action: rule?.action || 'reply',
    actionValue: rule?.actionValue || '',
    enabled: rule?.enabled ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{rule ? 'Editar Regra' : 'Nova Regra'}</h2>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="rule-form">
          <div className="form-group">
            <label>Nome da Regra</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Tipo de Gatilho</label>
            <select name="trigger" value={formData.trigger} onChange={handleChange}>
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Valor do Gatilho</label>
            <input
              type="text"
              name="triggerValue"
              value={formData.triggerValue}
              onChange={handleChange}
              placeholder="Palavra-chave ou padrão"
            />
          </div>

          <div className="form-group">
            <label>Tipo de Ação</label>
            <select name="action" value={formData.action} onChange={handleChange}>
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Valor da Ação</label>
            <textarea
              name="actionValue"
              value={formData.actionValue}
              onChange={handleChange}
              placeholder="Mensagem de resposta ou URL do webhook"
              rows={3}
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="enabled"
                checked={formData.enabled}
                onChange={handleChange}
              />
              Regra Ativa
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
