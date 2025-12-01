import React, { useEffect, useRef } from 'react';
import './CallInterface.css';

function CallInterface({ call, onEndCall }) {
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    // Set up local audio
    if (localAudioRef.current && call.localStream) {
      localAudioRef.current.srcObject = call.localStream;
    }

    // Set up remote audio
    if (remoteAudioRef.current && call.remoteStream) {
      remoteAudioRef.current.srcObject = call.remoteStream;
    }
  }, [call.localStream, call.remoteStream]);

  return (
    <div className="call-interface">
      <div className="call-header">
        <h2>Call in Progress</h2>
        <p className="call-target">Calling: {call.targetId}</p>
      </div>

      <div className="audio-controls">
        <div className="audio-container">
          <div className="audio-label">You</div>
          <audio
            ref={localAudioRef}
            autoPlay
            muted
            playsInline
            className="audio-element"
          />
          <div className="audio-visualizer">
            <div className="visualizer-bar"></div>
            <div className="visualizer-bar"></div>
            <div className="visualizer-bar"></div>
          </div>
        </div>

        <div className="audio-container">
          <div className="audio-label">Remote</div>
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            className="audio-element"
          />
          <div className="audio-visualizer">
            <div className="visualizer-bar"></div>
            <div className="visualizer-bar"></div>
            <div className="visualizer-bar"></div>
          </div>
        </div>
      </div>

      <div className="call-status">
        {call.remoteStream ? (
          <span className="status-connected">Connected</span>
        ) : (
          <span className="status-connecting">Connecting...</span>
        )}
      </div>

      <button className="end-call-button" onClick={onEndCall}>
        📞 End Call
      </button>
    </div>
  );
}

export default CallInterface;

