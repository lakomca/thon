import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import CallInterface from './components/CallInterface';
import ClientList from './components/ClientList';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

function App() {
  const [ws, setWs] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [availableClients, setAvailableClients] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Use refs to access latest values in callbacks
  const wsRef = useRef(null);
  const currentCallRef = useRef(null);
  const clientIdRef = useRef(null);

  // Update refs when state changes
  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  const endCall = useCallback(() => {
    const call = currentCallRef.current;
    if (call) {
      // Stop all tracks
      if (call.localStream) {
        call.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close peer connection
      if (call.peerConnection) {
        call.peerConnection.close();
      }
      
      // Notify peer
      const websocket = wsRef.current;
      if (websocket && call.targetId) {
        websocket.send(JSON.stringify({
          type: 'call-end',
          targetId: call.targetId
        }));
      }
      
      setCurrentCall(null);
    }
  }, []);

  const acceptCall = useCallback(async (data) => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.onicecandidate = (event) => {
        const websocket = wsRef.current;
        if (event.candidate && websocket) {
          websocket.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            targetId: data.callerId
          }));
        }
      };

      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setCurrentCall({
          peerConnection,
          localStream: stream,
          remoteStream: remoteStream,
          targetId: data.callerId,
          isIncoming: true
        });
      };

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      const websocket = wsRef.current;
      if (websocket) {
        websocket.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          targetId: data.callerId
        }));
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Failed to accept call. Please check microphone permissions.');
    }
  }, []);

  const handleIncomingCall = useCallback((data) => {
    // Show incoming call notification
    if (window.confirm(`Incoming call from ${data.callerId}. Accept?`)) {
      acceptCall(data);
    } else {
      // Reject call
      const websocket = wsRef.current;
      if (websocket) {
        websocket.send(JSON.stringify({
          type: 'call-end',
          targetId: data.callerId
        }));
      }
    }
  }, [acceptCall]);

  const startCall = useCallback(async (targetId) => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Get user media (microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Add audio tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        const websocket = wsRef.current;
        if (event.candidate && websocket) {
          websocket.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            targetId: targetId
          }));
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setCurrentCall({
          peerConnection,
          localStream: stream,
          remoteStream: remoteStream,
          targetId: targetId,
          isIncoming: false
        });
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      const websocket = wsRef.current;
      if (websocket) {
        websocket.send(JSON.stringify({
          type: 'offer',
          offer: offer,
          targetId: targetId
        }));
      }

      setCurrentCall({
        peerConnection,
        localStream: stream,
        remoteStream: null,
        targetId: targetId,
        isIncoming: false
      });
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start call. Please check microphone permissions.');
    }
  }, []);

  useEffect(() => {
    // Connect to WebSocket server
    const websocket = new WebSocket(WS_URL);

    websocket.onopen = () => {
      console.log('Connected to signaling server');
      setConnectionStatus('connected');
      setWs(websocket);
      wsRef.current = websocket;
      
      // Generate and register client ID
      const id = `user_${Math.random().toString(36).substr(2, 9)}`;
      websocket.send(JSON.stringify({
        type: 'register',
        clientId: id
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'registered':
          setClientId(data.clientId);
          clientIdRef.current = data.clientId;
          break;
          
        case 'client-list':
          const currentClientId = clientIdRef.current;
          setAvailableClients(data.clients.filter(id => id !== currentClientId));
          break;
          
        case 'offer':
          // Incoming call
          handleIncomingCall(data);
          break;
          
        case 'answer':
          // Call answered
          const call = currentCallRef.current;
          if (call && call.peerConnection) {
            call.peerConnection.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
          }
          break;
          
        case 'ice-candidate':
          // Add ICE candidate
          const currentCall = currentCallRef.current;
          if (currentCall && currentCall.peerConnection) {
            currentCall.peerConnection.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          }
          break;
          
        case 'call-end':
          // Call ended by peer
          endCall();
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    websocket.onclose = () => {
      console.log('Disconnected from signaling server');
      setConnectionStatus('disconnected');
      setWs(null);
      wsRef.current = null;
    };

    return () => {
      websocket.close();
    };
  }, [handleIncomingCall, endCall]);

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>Voice WebApp</h1>
          <div className="status">
            <span className={`status-indicator ${connectionStatus}`}></span>
            <span>{connectionStatus}</span>
            {clientId && <span className="client-id">ID: {clientId}</span>}
          </div>
        </header>

        {currentCall ? (
          <CallInterface
            call={currentCall}
            onEndCall={endCall}
          />
        ) : (
          <ClientList
            clients={availableClients}
            onStartCall={startCall}
            currentClientId={clientId}
          />
        )}
      </div>
    </div>
  );
}

export default App;

