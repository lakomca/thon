import React from 'react';
import './ClientList.css';

function ClientList({ clients, onStartCall, currentClientId }) {
  if (clients.length === 0) {
    return (
      <div className="client-list">
        <div className="empty-state">
          <p>No other users online.</p>
          <p className="hint">Open this app in another browser tab/window to make a call!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-list">
      <h2>Available Users</h2>
      <ul className="clients">
        {clients.map((clientId) => (
          <li key={clientId} className="client-item">
            <span className="client-name">{clientId}</span>
            <button
              className="call-button"
              onClick={() => onStartCall(clientId)}
            >
              📞 Call
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ClientList;

