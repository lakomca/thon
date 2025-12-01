import React, { useEffect, useRef } from 'react';
import './CallInterface.css';

function CallInterface({ call, onEndCall }) {
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localAudioRef.current && call.localStream) {
      localAudioRef.current.srcObject = call.localStream;
    }
  }, [call.localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && call.remoteStream) {
      remoteAudioRef.current.srcObject = call.remoteStream;
    }
  }, [call.remoteStream]);

  return (
    <div className="call-interface">
      <div className="call-screen">
        <div className="caller-avatar-large">
          <div className="avatar-circle-large">
            {call.targetId ? call.targetId.charAt(0).toUpperCase() : '?'}
          </div>
        </div>
        
        <div className="caller-details">
          <h2 className="caller-name-large">{call.targetId}</h2>
          <div className="call-status-indicator">
            {call.connected ? (
              <span className="status-connected">Connected</span>
            ) : (
              <span className="status-connecting">
                {call.isIncoming ? 'Answering...' : 'Calling...'}
              </span>
            )}
          </div>
        </div>

        <div className="call-timer">
          {call.connected && <span>00:00</span>}
        </div>

        <div className="call-controls">
          <button className="mute-btn" title="Mute">
            <span>🔇</span>
          </button>
          <button className="end-call-btn-large" onClick={onEndCall}>
            <span className="end-icon">📞</span>
          </button>
          <button className="speaker-btn" title="Speaker">
            <span>🔊</span>
          </button>
        </div>
      </div>
      
      <audio ref={localAudioRef} autoPlay muted playsInline style={{ display: 'none' }} />
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
}

export default CallInterface;
