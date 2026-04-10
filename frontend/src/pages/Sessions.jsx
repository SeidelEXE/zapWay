import { useState, useEffect } from 'react';
import { api } from '../services/api';
import SessionCard from '../components/SessionCard';
import QRModal from '../components/QRModal';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const result = await api.createSession();
      if (result.qr) {
        setQrCode(result.qr);
        setShowQR(true);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.deleteSession(sessionId);
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  return (
    <div className="sessions-page">
      <div className="page-header">
        <h1>Sessões</h1>
        <button onClick={handleCreateSession} className="btn-primary">
          Nova Sessão
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : sessions.length === 0 ? (
        <p>Nenhuma sessão encontrada.</p>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onDelete={() => handleDeleteSession(session.id)}
            />
          ))}
        </div>
      )}

      {showQR && (
        <QRModal qrCode={qrCode} onClose={() => setShowQR(false)} />
      )}
    </div>
  );
}
