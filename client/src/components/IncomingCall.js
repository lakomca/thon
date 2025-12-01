import React from 'react';
import './IncomingCall.css';

function IncomingCall({ callerId, onAccept, onReject }) {
  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-container">
        <div className="caller-avatar">
          <div className="avatar-circle">
            {callerId ? callerId.charAt(0).toUpperCase() : '?'}
          </div>
        </div>
        <div className="caller-info">
          <h2 className="caller-name">{callerId}</h2>
          <p className="call-status">Incoming Call</p>
        </div>
        <div className="call-actions">
          <button className="reject-call-btn" onClick={onReject}>
            <span className="icon">✕</span>
            <span className="label">Decline</span>
          </button>
          <button className="accept-call-btn" onClick={onAccept}>
            <span className="icon">✓</span>
            <span className="label">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCall;

