import { useState, useEffect } from 'react';
import { api } from '../services/api';
import SessionCard from '../components/SessionCard';
import QRModal from '../components/QRModal';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:3001/ws/sessions`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setError('');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event: eventName, data } = message;

        if (eventName === 'qr-code' && data?.qr) {
          setActiveSessionId(data.sessionId);
          setQrCode(data.qr);
          setShowQR(true);
          loadSessions();
        }

        if (eventName === 'session-status' || eventName === 'session-created') {
          loadSessions();
        }

        if (eventName === 'error') {
          setError(data?.message || 'Erro recebido do backend');
        }
      } catch {
        setError('Resposta inválida recebida pelo WebSocket');
      }
    };

    socket.onerror = () => setError('Não foi possível conectar ao WebSocket do backend');

    return () => {
      clearInterval(interval);
      socket.close();
    };
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
      setError('');
      setQrCode(null);
      setShowQR(true);
      const result = await api.createSession();
      setActiveSessionId(result.id);
      await loadSessions();
    } catch (error) {
      setShowQR(false);
      setError(error.message || 'Não foi possível criar a sessão');
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

      {error && <div className="alert-error">{error}</div>}

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
        <QRModal
          qrCode={qrCode}
          sessionId={activeSessionId}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}
