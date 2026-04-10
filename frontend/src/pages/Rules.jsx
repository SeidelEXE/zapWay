import { useState, useEffect } from 'react';
import { api } from '../services/api';
import RuleForm from '../components/RuleForm';
import Table from '../components/Table';

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await api.getRules();
      setRules(data);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (ruleData) => {
    try {
      if (editingRule) {
        await api.updateRule(editingRule.id, ruleData);
      } else {
        await api.createRule(ruleData);
      }
      setShowForm(false);
      setEditingRule(null);
      loadRules();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await api.deleteRule(ruleId);
      loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'trigger', label: 'Gatilho' },
    { key: 'action', label: 'Ação' },
    { key: 'enabled', label: 'Status' }
  ];

  return (
    <div className="rules-page">
      <div className="page-header">
        <h1>Regras de Automação</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          Nova Regra
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : rules.length === 0 ? (
        <p>Nenhuma regra encontrada.</p>
      ) : (
        <Table
          columns={columns}
          data={rules}
          onEdit={handleEditRule}
          onDelete={handleDeleteRule}
        />
      )}

      {showForm && (
        <RuleForm
          rule={editingRule}
          onSave={handleSaveRule}
          onClose={() => {
            setShowForm(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}
