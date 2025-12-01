import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import CallInterface from './components/CallInterface';
import ClientList from './components/ClientList';
import IncomingCall from './components/IncomingCall';

// Helper function to get getUserMedia with fallback support
const getGetUserMedia = () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  } else if (navigator.getUserMedia) {
    return (constraints) => new Promise((resolve, reject) => 
      navigator.getUserMedia(constraints, resolve, reject));
  } else if (navigator.webkitGetUserMedia) {
    return (constraints) => new Promise((resolve, reject) => 
      navigator.webkitGetUserMedia(constraints, resolve, reject));
  } else if (navigator.mozGetUserMedia) {
    return (constraints) => new Promise((resolve, reject) => 
      navigator.mozGetUserMedia(constraints, resolve, reject));
  }
  return null;
};

// Get Socket.io server URL
const getServerURL = () => {
  if (process.env.REACT_APP_SERVER_URL) {
    return process.env.REACT_APP_SERVER_URL;
  }
  const savedURL = localStorage.getItem('voiceApp_serverURL');
  if (savedURL) {
    return savedURL;
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${hostname}:3001`;
};

// STUN servers for NAT traversal
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function App() {
  const [socket, setSocket] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [availableClients, setAvailableClients] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverURL, setServerURL] = useState(() => getServerURL());
  
  const socketRef = useRef(null);
  const currentCallRef = useRef(null);
  const clientIdRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // Store RTCPeerConnections by targetId
  const pendingOffersRef = useRef(new Map()); // Store pending offers by senderId

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  const endCall = useCallback(() => {
    const call = currentCallRef.current;
    if (call) {
      // Close peer connection
      const peerConn = peerConnectionsRef.current.get(call.targetId);
      if (peerConn) {
        peerConn.close();
        peerConnectionsRef.current.delete(call.targetId);
      }
      
      // Stop local stream
      if (call.localStream) {
        call.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Stop remote stream
      if (call.remoteStream) {
        call.remoteStream.getTracks().forEach(track => track.stop());
      }
      
      // Notify peer via Socket.io
      const currentSocket = socketRef.current;
      if (currentSocket && call.targetId) {
        currentSocket.emit('call-end', {
          targetId: call.targetId
        });
      }
      
      setCurrentCall(null);
    }
  }, []);

  const checkMicrophone = useCallback(async () => {
    try {
      const getUserMedia = getGetUserMedia();
      if (!getUserMedia) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isSecure = protocol === 'https:';
        
        let errorMsg = 'getUserMedia is not supported. ';
        if (!isSecure && !isLocalhost) {
          errorMsg += 'Please access via HTTPS or localhost.';
        } else {
          errorMsg += 'Please use a modern browser.';
        }
        throw new Error(errorMsg);
      }
      
      const stream = await getUserMedia({ audio: true });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('No audio tracks found');
      }
      
      stream.getTracks().forEach(track => track.stop());
      return { available: true };
    } catch (error) {
      // Return error details instead of silently failing
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return { 
          available: false, 
          error: 'No microphone found. Please connect a microphone device.' 
        };
      }
      
      // Log and return error details
      console.error('Microphone check failed:', error);
      let errorMessage = 'Microphone access failed. ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      } else if (error.message && error.message.includes('not supported')) {
        errorMessage = error.message;
      } else {
        errorMessage += error.message || 'Unknown error.';
      }
      
      return { available: false, error: errorMessage };
    }
  }, []);

  const startCall = useCallback(async (targetId) => {
    try {
      console.log('Starting call to', targetId);
      
      const getUserMedia = getGetUserMedia();
      if (!getUserMedia) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isSecure = protocol === 'https:';
        
        let errorMsg = 'getUserMedia is not supported in this browser or context.\n\n';
        if (!isSecure && !isLocalhost) {
          errorMsg += '⚠️ You are accessing via HTTP. getUserMedia requires HTTPS or localhost.\n\n';
          errorMsg += 'Solutions:\n';
          errorMsg += '1. Access via HTTPS (https://your-domain.com)\n';
          errorMsg += '2. Access via localhost (http://localhost:3000)\n';
          errorMsg += '3. Use a modern browser (Chrome, Firefox, Edge, Safari)';
        } else {
          errorMsg += 'Please use a modern browser that supports WebRTC:\n';
          errorMsg += '- Chrome/Edge (recommended)\n';
          errorMsg += '- Firefox\n';
          errorMsg += '- Safari (macOS/iOS)';
        }
        alert(errorMsg);
        throw new Error('getUserMedia not supported');
      }
      
      // Try to get microphone, but allow call to proceed even if it fails
      let stream = null;
      try {
        console.log('Getting user media...');
        stream = await getUserMedia({ audio: true });
        console.log('Got user media stream');
      } catch (error) {
        console.warn('Could not access microphone:', error);
        const proceed = window.confirm(
          (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') 
            ? 'No microphone found. Do you want to proceed anyway? (You can listen but not speak)'
            : 'Microphone access failed. Do you want to proceed anyway? (You can listen but not speak)'
        );
        if (!proceed) {
          return;
        }
        // Create an empty stream so the call can proceed
        stream = new MediaStream();
      }
      
      // Create RTCPeerConnection
      const peerConnection = new RTCPeerConnection(iceServers);
      console.log('Created RTCPeerConnection');
      
      // Add local stream tracks (if any)
      if (stream && stream.getTracks().length > 0) {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
      }
      
      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote stream from', targetId);
        const remoteStream = event.streams[0];
        setCurrentCall(prev => prev ? { ...prev, remoteStream, connected: true } : null);
      };
      
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
          setCurrentCall(prev => prev ? { ...prev, connected: true } : null);
        } else if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
          console.log('ICE connection failed/disconnected');
          endCall();
        }
      };
      
      peerConnection.onclose = () => {
        console.log('Peer connection closed');
        endCall();
      };
      
      // Set up ICE candidate handler
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate generated');
          const currentSocket = socketRef.current;
          if (currentSocket) {
            currentSocket.emit('webrtc-ice-candidate', {
              targetId: targetId,
              candidate: event.candidate
            });
          }
        } else {
          console.log('ICE gathering complete');
        }
      };
      
      peerConnectionsRef.current.set(targetId, peerConnection);
      
      setCurrentCall({
        localStream: stream,
        targetId: targetId,
        isIncoming: false,
        connected: false
      });
      
      // Request call via Socket.io first
      const currentSocket = socketRef.current;
      if (currentSocket) {
        console.log('📤 Sending call-request to', targetId);
        console.log('Socket connected:', currentSocket.connected);
        console.log('Socket ID:', currentSocket.id);
        currentSocket.emit('call-request', {
          targetId: targetId
        });
        console.log('Call-request emitted');
      } else {
        console.error('❌ Socket not connected!');
        alert('Not connected to server. Please check your connection.');
        return;
      }
      
      // Store peer connection - offer will be sent after call-accept
      // The offer creation will happen in the call-accept handler
      
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start call: ' + (error.message || 'Unknown error'));
      endCall();
    }
  }, [checkMicrophone, endCall]);

  const acceptCall = useCallback(async (data) => {
    try {
      const getUserMedia = getGetUserMedia();
      if (!getUserMedia) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isSecure = protocol === 'https:';
        
        let errorMsg = 'getUserMedia is not supported in this browser or context.\n\n';
        if (!isSecure && !isLocalhost) {
          errorMsg += '⚠️ You are accessing via HTTP. getUserMedia requires HTTPS or localhost.\n\n';
          errorMsg += 'Solutions:\n';
          errorMsg += '1. Access via HTTPS (https://your-domain.com)\n';
          errorMsg += '2. Access via localhost (http://localhost:3000)\n';
          errorMsg += '3. Use a modern browser (Chrome, Firefox, Edge, Safari)';
        } else {
          errorMsg += 'Please use a modern browser that supports WebRTC:\n';
          errorMsg += '- Chrome/Edge (recommended)\n';
          errorMsg += '- Firefox\n';
          errorMsg += '- Safari (macOS/iOS)';
        }
        alert(errorMsg);
        throw new Error('getUserMedia not supported');
      }
      
      // Try to get microphone, but allow call to proceed even if it fails
      let stream = null;
      try {
        stream = await getUserMedia({ audio: true });
      } catch (error) {
        console.warn('Could not access microphone:', error);
        const proceed = window.confirm(
          (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') 
            ? 'No microphone found. Do you want to proceed anyway? (You can listen but not speak)'
            : 'Microphone access failed. Do you want to proceed anyway? (You can listen but not speak)'
        );
        if (!proceed) {
          return;
        }
        // Create an empty stream so the call can proceed
        stream = new MediaStream();
      }
      
      // Create RTCPeerConnection
      const peerConnection = new RTCPeerConnection(iceServers);
      
      // Add local stream tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
      
      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setCurrentCall(prev => prev ? { ...prev, remoteStream, connected: true } : null);
      };
      
      peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
          setCurrentCall(prev => prev ? { ...prev, connected: true } : null);
        } else if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
          endCall();
        }
      };
      
      peerConnection.onclose = () => {
        endCall();
      };
      
      // Set up ICE candidate handler
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const currentSocket = socketRef.current;
          if (currentSocket) {
            currentSocket.emit('webrtc-ice-candidate', {
              targetId: data.callerId,
              candidate: event.candidate
            });
          }
        }
      };
      
      peerConnectionsRef.current.set(data.callerId, peerConnection);
      
      setCurrentCall({
        localStream: stream,
        targetId: data.callerId,
        isIncoming: true,
        connected: false
      });
      
      // Check if there's a pending offer
      const pendingOffer = pendingOffersRef.current.get(data.callerId);
      if (pendingOffer) {
        console.log('Found pending offer, handling it');
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          console.log('Created answer, sending to', data.callerId);
          const currentSocket = socketRef.current;
          if (currentSocket) {
            currentSocket.emit('webrtc-answer', {
              targetId: data.callerId,
              answer: answer
            });
          }
          pendingOffersRef.current.delete(data.callerId);
        } catch (error) {
          console.error('Error handling pending offer:', error);
        }
      } else {
        console.log('No pending offer, waiting for offer from', data.callerId);
      }
      
      // Accept call via Socket.io
      const currentSocket = socketRef.current;
      if (currentSocket) {
        currentSocket.emit('call-accept', {
          targetId: data.callerId
        });
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Failed to accept call: ' + (error.message || 'Unknown error'));
      endCall();
    }
  }, [checkMicrophone, endCall]);

  const handleIncomingCall = useCallback((data) => {
    console.log('handleIncomingCall called with:', data);
    setIncomingCall(data);
    console.log('Incoming call state set');
  }, []);

  const handleAcceptCall = useCallback(() => {
    if (incomingCall) {
      console.log('Accepting call from', incomingCall.callerId);
      acceptCall(incomingCall);
      setIncomingCall(null);
    } else {
      console.warn('No incoming call to accept');
    }
  }, [incomingCall, acceptCall]);

  const handleRejectCall = useCallback(() => {
    if (incomingCall) {
      const currentSocket = socketRef.current;
      if (currentSocket) {
        currentSocket.emit('call-reject', {
          targetId: incomingCall.callerId
        });
      }
      setIncomingCall(null);
    }
  }, [incomingCall]);

  useEffect(() => {
    const getOrCreateClientId = () => {
      const storedId = localStorage.getItem('voiceApp_clientId');
      if (storedId) {
        return storedId;
      }
      const newId = `user_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('voiceApp_clientId', newId);
      return newId;
    };

    const serverUrl = getServerURL();
    const newSocket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      setSocket(newSocket);
      socketRef.current = newSocket;
      
      // Check if getUserMedia will work
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const isSecure = protocol === 'https:';
      
      if (!isSecure && !isLocalhost) {
        console.warn('⚠️ Accessing via HTTP. getUserMedia requires HTTPS or localhost.');
        console.warn('For calls to work, access via: http://localhost:3000 or https://your-domain.com');
      }
      
      const id = getOrCreateClientId();
      setClientId(id);
      clientIdRef.current = id;
      
      newSocket.emit('register', { clientId: id });
    });

    newSocket.on('registered', (data) => {
      const confirmedId = data.clientId;
      setClientId(confirmedId);
      clientIdRef.current = confirmedId;
      localStorage.setItem('voiceApp_clientId', confirmedId);
    });

    newSocket.on('client-list', (data) => {
      const currentClientId = clientIdRef.current;
      console.log('📋 Client list received:', data.clients);
      console.log('Current client ID:', currentClientId);
      const filtered = data.clients.filter(id => id !== currentClientId);
      console.log('✅ Available clients to call:', filtered);
      if (filtered.length === 0) {
        console.warn('⚠️ No other clients available to call!');
      }
      setAvailableClients(filtered);
    });

    newSocket.on('call-request', (data) => {
      console.log('📞 Received call-request event!', data);
      console.log('Caller ID:', data.callerId);
      console.log('Current client ID:', clientIdRef.current);
      console.log('Socket connected:', newSocket.connected);
      if (!data || !data.callerId) {
        console.error('Invalid call-request data:', data);
        return;
      }
      handleIncomingCall(data);
    });

    newSocket.on('webrtc-offer', async (data) => {
      try {
        const call = currentCallRef.current;
        const peerConnection = peerConnectionsRef.current.get(data.senderId);
        
        // If we have a peer connection and it's an incoming call, handle the offer
        if (peerConnection && call && call.targetId === data.senderId && call.isIncoming) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          const currentSocket = socketRef.current;
          if (currentSocket) {
            currentSocket.emit('webrtc-answer', {
              targetId: data.senderId,
              answer: answer
            });
          }
        } else {
          // Store the offer if peer connection isn't ready yet
          pendingOffersRef.current.set(data.senderId, data.offer);
        }
      } catch (error) {
        console.error('Error handling WebRTC offer:', error);
      }
    });

    newSocket.on('webrtc-answer', async (data) => {
      try {
        const peerConnection = peerConnectionsRef.current.get(data.senderId);
        if (!peerConnection) {
          console.warn('No peer connection found for answer from:', data.senderId);
          return;
        }
        
        console.log('Received answer from', data.senderId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Set remote description for', data.senderId);
      } catch (error) {
        console.error('Error handling WebRTC answer:', error);
      }
    });

    newSocket.on('webrtc-ice-candidate', async (data) => {
      try {
        const peerConnection = peerConnectionsRef.current.get(data.senderId);
        if (!peerConnection) {
          console.warn('No peer connection found for ICE candidate from:', data.senderId);
          return;
        }
        
        // Only add ICE candidate if remote description is set
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          console.warn('Remote description not set yet, ICE candidate will be added later');
          // Store candidate to add later if needed
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    newSocket.on('call-accept', async (data) => {
      // Call was accepted, now send the offer
      console.log('Call accepted from', data.answererId || 'unknown', '- creating and sending offer');
      const call = currentCallRef.current;
      console.log('Current call state:', call ? { targetId: call.targetId, isIncoming: call.isIncoming } : 'null');
      
      if (call && !call.isIncoming) {
        const peerConnection = peerConnectionsRef.current.get(call.targetId);
        console.log('Peer connection exists:', !!peerConnection);
        
        if (peerConnection) {
          try {
            console.log('Creating offer for', call.targetId);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            console.log('Sending offer to', call.targetId);
            const currentSocket = socketRef.current;
            if (currentSocket) {
              currentSocket.emit('webrtc-offer', {
                targetId: call.targetId,
                offer: offer
              });
              console.log('Offer sent successfully');
            } else {
              console.error('Socket not available to send offer');
            }
          } catch (error) {
            console.error('Error creating/sending offer after accept:', error);
          }
        } else {
          console.error('No peer connection found for', call.targetId);
        }
      } else {
        console.warn('Call state incorrect - call:', call, 'isIncoming:', call?.isIncoming);
      }
    });

    newSocket.on('call-reject', () => {
      alert('Call was rejected');
      endCall();
    });

    newSocket.on('call-end', () => {
      endCall();
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
    });

    return () => {
      newSocket.close();
    };
  }, [handleIncomingCall, endCall]);


  const changeUsername = () => {
    const username = newUsername.trim();
    if (username && username.length > 0 && socketRef.current && socketRef.current.connected) {
      localStorage.setItem('voiceApp_clientId', username);
      socketRef.current.emit('register', { clientId: username });
      setClientId(username);
      clientIdRef.current = username;
      setShowUsernameEdit(false);
      setNewUsername('');
    }
  };

  const changeServerURL = () => {
    const url = serverURL.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const currentSocket = socketRef.current;
      if (currentSocket) {
        currentSocket.close();
      }
      localStorage.setItem('voiceApp_serverURL', url);
      setConnectionStatus('disconnected');
      setSocket(null);
      socketRef.current = null;
      setAvailableClients([]);
      setShowServerConfig(false);
      window.location.reload();
    } else {
      alert('Invalid server URL. Must start with http:// or https://');
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>Voice WebApp</h1>
          <div className="status">
            <span className={`status-indicator ${connectionStatus}`}></span>
            <span>{connectionStatus}</span>
            {clientId && (
              <div className="client-id-container">
                <span className="client-id">ID: {clientId}</span>
                {!showUsernameEdit && (
                  <button 
                    className="edit-username-btn"
                    onClick={() => {
                      setNewUsername(clientId);
                      setShowUsernameEdit(true);
                    }}
                    title="Change username"
                  >
                    ✏️
                  </button>
                )}
                {showUsernameEdit && (
                  <div className="username-edit">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && changeUsername()}
                      className="username-input"
                      placeholder="Enter new username"
                      autoFocus
                    />
                    <button className="save-username-btn" onClick={changeUsername}>✓</button>
                    <button className="cancel-username-btn" onClick={() => {
                      setShowUsernameEdit(false);
                      setNewUsername('');
                    }}>✕</button>
                  </div>
                )}
              </div>
            )}
            <button className="server-config-btn" onClick={() => setShowServerConfig(!showServerConfig)} title="Configure server">⚙️</button>
          </div>
          {showServerConfig && (
            <div className="server-config">
              <p className="server-config-label">Server URL:</p>
              <div className="server-config-input-group">
                <input
                  type="text"
                  value={serverURL}
                  onChange={(e) => setServerURL(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && changeServerURL()}
                  className="server-url-input"
                  placeholder="http://192.168.1.100:3001"
                />
                <button className="save-server-btn" onClick={changeServerURL}>Save</button>
                <button className="cancel-server-btn" onClick={() => {
                  setShowServerConfig(false);
                  setServerURL(getServerURL());
                }}>Cancel</button>
              </div>
              <p className="server-config-hint">
                Current: {getServerURL()}<br/>
                For other devices, use your computer's IP address
              </p>
            </div>
          )}
        </header>

        {incomingCall ? (
          <IncomingCall
            callerId={incomingCall.callerId}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        ) : currentCall ? (
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
