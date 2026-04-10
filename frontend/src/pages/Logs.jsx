import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Table from '../components/Table';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const data = await api.getLogs();
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) =>
    log.message?.toLowerCase().includes(filter.toLowerCase()) ||
    log.session?.toLowerCase().includes(filter.toLowerCase())
  );

  const columns = [
    { key: 'timestamp', label: 'Data/Hora' },
    { key: 'session', label: 'Sessão' },
    { key: 'type', label: 'Tipo' },
    { key: 'message', label: 'Mensagem' }
  ];

  return (
    <div className="logs-page">
      <div className="page-header">
        <h1>Logs</h1>
        <input
          type="text"
          placeholder="Filtrar logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : filteredLogs.length === 0 ? (
        <p>Nenhum log encontrado.</p>
      ) : (
        <Table columns={columns} data={filteredLogs} />
      )}
    </div>
  );
}
