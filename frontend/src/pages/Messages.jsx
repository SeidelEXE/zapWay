import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';

function extractText(message) {
  const payload = message?.message || {};
  return payload.conversation || payload.extendedTextMessage?.text
    || payload.imageMessage?.caption || payload.videoMessage?.caption
    || payload.text || '[mensagem sem texto]';
}

function normalizeMessage(message, direction) {
  return {
    id: message?.key?.id || `${Date.now()}-${Math.random()}`,
    direction,
    text: extractText(message),
    contact: message?.key?.remoteJid || 'desconhecido',
    timestamp: message?.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date()
  };
}

export default function Messages() {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [connection, setConnection] = useState('connecting');
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.getMessages(sessionId);
      setMessages((data || []).map((item) => ({
        id: item.id,
        direction: item.fromMe ? 'outgoing' : 'incoming',
        text: item.text || '[mensagem sem texto]',
        contact: item.from || 'desconhecido',
        timestamp: new Date(item.receivedAt || item.timestamp)
      })));
    } catch (requestError) {
      setError(`HTTP: ${requestError.message}`);
    }
  }, [sessionId]);

  useEffect(() => {
    loadMessages();
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:3001/ws/sessions`;
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setConnection('connected');
    socket.onerror = () => setConnection('error');
    socket.onclose = () => setConnection('disconnected');
    socket.onmessage = (event) => {
      try {
        const { event: eventName, data } = JSON.parse(event.data);
        if (eventName === 'new-message' && data?.sessionId === sessionId) {
          const direction = data.message?.key?.fromMe ? 'outgoing' : 'incoming';
          setMessages((current) => [...current, normalizeMessage(data.message, direction)]);
        }
      } catch {
        setError('Evento inválido recebido pelo WebSocket');
      }
    };
    return () => socket.close();
  }, [loadMessages, sessionId]);

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [messages]
  );

  return (
    <div className="messages-page">
      <div className="page-header">
        <div>
          <Link to="/sessions" className="back-link">← Sessões</Link>
          <h1>Messages</h1>
          <p className="page-subtitle">Sessão: {sessionId}</p>
        </div>
        <span className={`connection-indicator ${connection}`}>WebSocket: {connection}</span>
      </div>
      {error && <div className="alert-error">{error}</div>}
      <div className="messages-console">
        {orderedMessages.length === 0 ? (
          <p className="empty-state">Nenhuma mensagem recebida nesta execução.</p>
        ) : orderedMessages.map((message) => (
          <article key={message.id} className={`message-line ${message.direction}`}>
            <div className="message-meta">
              <strong>{message.direction === 'incoming' ? 'RECEBIDA' : 'ENVIADA'}</strong>
              <span>{new Date(message.timestamp).toLocaleString()}</span>
              <span>{message.contact}</span>
            </div>
            <div className="message-text">{message.text}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
