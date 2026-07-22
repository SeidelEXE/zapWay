import { QRCodeSVG } from 'qrcode.react';

export default function QRModal({ qrCode, sessionId, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Escaneie o QR Code</h2>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>
        <div className="modal-body">
          {qrCode ? (
            <QRCodeSVG value={qrCode} size={280} level="M" className="qr-image" />
          ) : (
            <p>Gerando QR Code para {sessionId || 'a nova sessão'}...</p>
          )}
        </div>
        <div className="modal-footer">
          <p>Abra o WhatsApp no seu celular e escaneie o código acima.</p>
        </div>
      </div>
    </div>
  );
}
