export default function SessionCard({ session, onDelete }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'connecting':
        return 'yellow';
      case 'disconnected':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="session-card">
      <div className="session-header">
        <h3>{session.name || session.id}</h3>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(session.status) }}
        >
          {session.status}
        </span>
      </div>
      <div className="session-info">
        <p><strong>ID:</strong> {session.id}</p>
        <p><strong>Phone:</strong> {session.phone || 'N/A'}</p>
        <p><strong>Criado em:</strong> {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}</p>
      </div>
      <div className="session-actions">
        <button onClick={onDelete} className="btn-danger">
          Excluir
        </button>
      </div>
    </div>
  );
}
