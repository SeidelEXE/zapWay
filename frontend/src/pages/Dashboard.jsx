import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    sessions: 0,
    messages: 0,
    rules: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [sessions, rules] = await Promise.all([
        api.getSessions(),
        api.getRules()
      ]);
      setStats({
        sessions: sessions.length,
        messages: 0,
        rules: rules.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Sessões Ativas</h3>
          <p className="stat-value">{stats.sessions}</p>
        </div>
        <div className="stat-card">
          <h3>Mensagens</h3>
          <p className="stat-value">{stats.messages}</p>
        </div>
        <div className="stat-card">
          <h3>Regras Ativas</h3>
          <p className="stat-value">{stats.rules}</p>
        </div>
      </div>
    </div>
  );
}
