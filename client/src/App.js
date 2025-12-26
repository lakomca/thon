import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import './App.css';
import Auth from './components/Auth';
import ContactsList from './components/ContactsList';
import ChatView from './components/ChatView';
import UserProfile from './components/UserProfile';
import CallInterface from './components/CallInterface';
import IncomingCall from './components/IncomingCall';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

// Log WebSocket URL for debugging
console.log('WebSocket URL:', WS_URL);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('contacts'); // 'contacts', 'chat', 'profile', 'call'
  const [selectedContactId, setSelectedContactId] = useState(null);
  
  // Voice calling state
  const [ws, setWs] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [wsUrl, setWsUrl] = useState(WS_URL);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  
  // Use refs to access latest values in callbacks
  const wsRef = useRef(null);
  const currentCallRef = useRef(null);
  const userRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectFnRef = useRef(null);

  // Update refs when state changes
  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Update last seen when user is active
  useEffect(() => {
    if (user && db) {
      const updateLastSeen = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastSeen: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error updating last seen:', error);
        }
      };

      updateLastSeen();
      const interval = setInterval(updateLastSeen, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, db]);

  // Check authentication state
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setView('auth');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        setUser(firebaseUser);
        setView('contacts');
      } else {
        // User is signed out
        setUser(null);
        setView('auth');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle incoming calls - defined before useEffect to avoid closure issues
  const handleIncomingCallRef = useRef(null);
  
  const handleIncomingCall = useCallback((data) => {
    console.log('handleIncomingCall called with:', data);
    // Store incoming call data to show caller information
    const incomingCallData = {
      callerId: data.callerId,
      offer: data.offer
    };
    console.log('Setting incoming call state to:', incomingCallData);
    console.log('Offer type:', typeof data.offer);
    console.log('Offer keys:', data.offer ? Object.keys(data.offer) : 'null');
    setIncomingCall(incomingCallData);
    console.log('Incoming call state set - component should re-render');
    
    // Verify state was set after a short delay
    setTimeout(() => {
      console.log('Verifying incoming call state was set...');
    }, 100);
  }, []);

  // Update ref when handleIncomingCall changes
  useEffect(() => {
    handleIncomingCallRef.current = handleIncomingCall;
  }, [handleIncomingCall]);

  // Debug: Log incoming call state changes (must be before conditional returns)
  // Commented out to avoid hooks order issues - can be re-enabled for debugging
  // useEffect(() => {
  //   console.log('Incoming call state:', incomingCall);
  //   console.log('Current call state:', currentCall);
  //   console.log('View state:', view);
  // }, [incomingCall, currentCall, view]);

  // WebSocket connection for voice calls with automatic reconnection
  useEffect(() => {
    if (!user) return;

    let websocket = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const baseDelay = 1000; // Start with 1 second

    const connect = () => {
      try {
        console.log('=== ATTEMPTING WEBSOCKET CONNECTION ===');
        console.log(`WebSocket URL: ${wsUrl}`);
        console.log(`User ID: ${user.uid}`);
        console.log(`Reconnect attempt: ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
        setConnectionStatus('connecting');
        
        websocket = new WebSocket(wsUrl);
        
        // Store connect function in ref for manual reconnection
        connectFnRef.current = connect;

        websocket.onopen = () => {
          console.log('=== WEBSOCKET CONNECTED SUCCESSFULLY ===');
          console.log('User ID:', user.uid);
          console.log('WebSocket URL:', wsUrl);
          setConnectionStatus('connected');
          setWs(websocket);
          wsRef.current = websocket;
          reconnectAttempts = 0; // Reset on successful connection
          
          // Register with Firebase user ID
          if (websocket.readyState === WebSocket.OPEN) {
            console.log('Registering with server as:', user.uid);
            websocket.send(JSON.stringify({
              type: 'register',
              clientId: user.uid
            }));
          } else {
            console.error('WebSocket not open when trying to register!');
          }
        };

        websocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'registered':
              console.log('Registered with signaling server');
              break;
              
            case 'client-list':
              // Client list update (not used but handled to avoid error)
              console.log('Client list received:', data.clients);
              break;
              
            case 'offer':
              // Incoming call
              console.log('=== INCOMING CALL RECEIVED ===');
              console.log('Received offer from:', data.callerId);
              console.log('Current user ID:', user.uid);
              console.log('Offer data keys:', Object.keys(data));
              console.log('Has callerId:', !!data.callerId);
              console.log('Has offer:', !!data.offer);
              if (data.callerId && data.offer) {
                console.log('Setting incoming call state...');
                // Use ref to get latest version of handler
                if (handleIncomingCallRef.current) {
                  console.log('Using handleIncomingCallRef');
                  handleIncomingCallRef.current(data);
                } else {
                  // Fallback: set state directly
                  console.log('Using fallback: setting state directly');
                  setIncomingCall({
                    callerId: data.callerId,
                    offer: data.offer
                  });
                }
                console.log('Incoming call state should be set now');
                console.log('Current incomingCall state will be updated...');
              } else {
                console.error('Invalid offer data - missing callerId or offer:', {
                  hasCallerId: !!data.callerId,
                  hasOffer: !!data.offer,
                  data: data
                });
              }
              break;
              
            case 'answer':
              // Call answered
              console.log('Received answer from:', data.answererId);
              const call = currentCallRef.current;
              if (call && call.peerConnection) {
                call.peerConnection.setRemoteDescription(
                  new RTCSessionDescription(data.answer)
                ).catch(error => {
                  console.error('Error setting remote description:', error);
                });
              } else {
                console.error('No active call or peer connection when answer received');
              }
              break;
              
            case 'ice-candidate':
              // Add ICE candidate
              const currentCall = currentCallRef.current;
              if (currentCall && currentCall.peerConnection) {
                currentCall.peerConnection.addIceCandidate(
                  new RTCIceCandidate(data.candidate)
                ).catch(error => {
                  console.error('Error adding ICE candidate:', error);
                });
              }
              break;
              
            case 'call-end':
              // Call ended by peer
              setIncomingCall(null);
              endCall();
              break;
              
            case 'call-rejected':
              // Call was rejected by peer
              console.log('Call rejected by:', data.rejecterId);
              const rejectionMessage = data.reason || 'User is busy';
              alert(rejectionMessage);
              setIncomingCall(null);
              endCall();
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        };

        websocket.onerror = (error) => {
          console.error('=== WEBSOCKET CONNECTION ERROR ===');
          console.error('Error object:', error);
          console.error('WebSocket URL attempted:', wsUrl);
          console.error('User ID:', user.uid);
          console.error('Error details:', {
            type: error.type,
            target: error.target,
            readyState: websocket?.readyState
          });
          console.error('Make sure:');
          console.error('1. The server is running (check terminal)');
          console.error('2. The WebSocket URL is correct in .env file');
          console.error('3. If connecting from different machine, use server IP instead of localhost');
          console.error('4. Firewall allows connections on port 3001');
          setConnectionStatus('error');
        };

        websocket.onclose = (event) => {
          console.log('=== WEBSOCKET DISCONNECTED ===');
          console.log('Close code:', event.code);
          console.log('Close reason:', event.reason || 'No reason provided');
          console.log('Was clean:', event.wasClean);
          console.log('User ID:', user.uid);
          console.log('WebSocket URL:', wsUrl);
          
          // Common close codes and their meanings
          const closeCodeMessages = {
            1000: 'Normal closure',
            1001: 'Going away',
            1002: 'Protocol error',
            1003: 'Unsupported data',
            1006: 'Abnormal closure (no close frame)',
            1007: 'Invalid data',
            1008: 'Policy violation',
            1009: 'Message too big',
            1010: 'Extension error',
            1011: 'Internal error',
            1015: 'TLS handshake failure'
          };
          
          const closeMessage = closeCodeMessages[event.code] || `Unknown code: ${event.code}`;
          console.log('Close meaning:', closeMessage);
          
          if (event.code === 1006) {
            console.error('Connection closed abnormally. Possible causes:');
            console.error('- Server is not running');
            console.error('- Wrong WebSocket URL');
            console.error('- Network/firewall blocking connection');
            console.error('- Server crashed or restarted');
          }
          
          setConnectionStatus('disconnected');
          setWs(null);
          wsRef.current = null;
          
          // Attempt to reconnect if not a normal closure and we haven't exceeded max attempts
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.error('=== MAX RECONNECTION ATTEMPTS REACHED ===');
            console.error('WebSocket URL:', wsUrl);
            console.error('User ID:', user.uid);
            console.error('Please check:');
            console.error('1. Server is running: npm run server');
            console.error('2. .env file has correct REACT_APP_WS_URL');
            console.error('3. If on different machine, use server IP: ws://[SERVER_IP]:3001');
            console.error('4. Firewall allows port 3001');
            setConnectionStatus('error');
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setConnectionStatus('error');
        
        // Retry connection
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts - 1), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      }
    };

    // Initial connection
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (websocket) {
        websocket.close();
      }
    };
  }, [user, wsUrl, reconnectTrigger]);

  // Manual reconnect function
  const handleReconnect = useCallback(() => {
    console.log('Manual reconnect triggered');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('connecting');
    // Trigger reconnection by incrementing reconnectTrigger
    setReconnectTrigger(prev => prev + 1);
  }, []);

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
      setIncomingCall(null);
      setView('contacts');
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

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevicesNotSupported');
      }

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
        setView('call');
      };

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      const websocket = wsRef.current;
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log('Sending answer to caller:', data.callerId);
        websocket.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          targetId: data.callerId
        }));
      } else {
        console.error('WebSocket not connected when sending answer');
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      let errorMessage = 'Failed to accept call: ' + error.message;
      
      if (error.message === 'MediaDevicesNotSupported' || !navigator.mediaDevices) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isHTTPS = window.location.protocol === 'https:';
        
        errorMessage = 'Microphone access requires HTTPS or localhost.\n\n' +
          'Current access: ' + window.location.protocol + '//' + window.location.hostname + '\n\n' +
          'Solutions:\n';
        
        if (!isLocalhost && !isHTTPS) {
          errorMessage += '• Option 1: Access from server machine using localhost:\n' +
            '  http://localhost:3000\n\n' +
            '• Option 2: Set up HTTPS (required for IP address access)\n' +
            '  Use a tool like ngrok or set up SSL certificate\n\n' +
            '• Option 3: Use a tunneling service:\n' +
            '  - ngrok: ngrok http 3000\n' +
            '  - Cloudflare Tunnel\n' +
            '  - Other HTTPS tunnel services\n\n';
        }
        
        errorMessage += '• Update your browser to the latest version\n' +
          '• Try a different browser (Chrome, Firefox, or Safari)';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied.\n\n' +
          'To allow microphone access:\n' +
          '1. Click the lock/info icon in your browser\'s address bar\n' +
          '2. Find "Microphone" and change it to "Allow"\n' +
          '3. Refresh the page and try again\n\n' +
          'Or check your browser settings:\n' +
          '• Chrome: Settings → Privacy and security → Site settings → Microphone\n' +
          '• Firefox: Preferences → Privacy & Security → Permissions → Microphone\n' +
          '• Safari: Preferences → Websites → Microphone';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found.\n\n' +
          'Please connect a microphone or headset and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Microphone is being used by another application.\n\n' +
          'Please close other applications using your microphone and try again.';
      }
      
      alert(errorMessage);
      endCall();
    }
  }, [endCall]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall) return;
    
    const callData = {
      callerId: incomingCall.callerId,
      offer: incomingCall.offer
    };
    
    setIncomingCall(null);
    await acceptCall(callData);
  }, [incomingCall, acceptCall]);

  const handleRejectCall = useCallback(() => {
    if (!incomingCall) return;
    
    // Reject call - send rejection message to caller
    const websocket = wsRef.current;
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'call-rejected',
        targetId: incomingCall.callerId,
        reason: 'User is busy'
      }));
    }
    
    setIncomingCall(null);
  }, [incomingCall]);

  const startCall = useCallback(async (targetId) => {
    let peerConnection = null;
    let stream = null;
    
    try {
      console.log('Starting call to:', targetId);
      
      // Check if user is available
      const currentUser = userRef.current || user;
      if (!currentUser || !currentUser.uid) {
        console.error('User not available for call');
        alert('User not authenticated. Please sign in again.');
        return;
      }
      
      // Check WebSocket connection
      const websocket = wsRef.current;
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        alert('Not connected to server. Please wait for connection and try again.');
        return;
      }

      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Peer connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          console.error('Peer connection failed or disconnected');
        }
      };

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevicesNotSupported');
      }

      // Get user media (microphone)
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Add audio tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        const websocket = wsRef.current;
        if (event.candidate && websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            targetId: targetId
          }));
        }
      };

      // Handle ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Remote stream received');
        const remoteStream = event.streams[0];
        setCurrentCall(prev => ({
          ...prev,
          remoteStream: remoteStream
        }));
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        // currentUser is already checked at the start of the function
        console.log('Sending offer to:', targetId);
        console.log('Current user ID:', currentUser.uid);
        console.log('WebSocket readyState:', websocket.readyState);
        const offerMessage = {
          type: 'offer',
          offer: offer,
          targetId: targetId
        };
        console.log('Offer message:', JSON.stringify(offerMessage).substring(0, 200) + '...');
        websocket.send(JSON.stringify(offerMessage));
        console.log('Offer sent successfully');
      } else {
        console.error('WebSocket not connected. State:', websocket ? websocket.readyState : 'null');
        alert('Not connected to server. Please wait for connection (check status indicator) and try again.');
        return;
      }

      // Set initial call state (will be updated when remote stream arrives)
      setCurrentCall({
        peerConnection,
        localStream: stream,
        remoteStream: null,
        targetId: targetId,
        isIncoming: false
      });
      setView('call');
    } catch (error) {
      console.error('Error starting call:', error);
      let errorMessage = 'Failed to start call: ' + error.message;
      
      if (error.message === 'MediaDevicesNotSupported' || !navigator.mediaDevices) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isHTTPS = window.location.protocol === 'https:';
        
        errorMessage = 'Microphone access requires HTTPS or localhost.\n\n' +
          'Current access: ' + window.location.protocol + '//' + window.location.hostname + '\n\n' +
          'Solutions:\n';
        
        if (!isLocalhost && !isHTTPS) {
          errorMessage += '• Option 1: Access from server machine using localhost:\n' +
            '  http://localhost:3000\n\n' +
            '• Option 2: Set up HTTPS (required for IP address access)\n' +
            '  Use a tool like ngrok or set up SSL certificate\n\n' +
            '• Option 3: Use a tunneling service:\n' +
            '  - ngrok: ngrok http 3000\n' +
            '  - Cloudflare Tunnel\n' +
            '  - Other HTTPS tunnel services\n\n';
        }
        
        errorMessage += '• Update your browser to the latest version\n' +
          '• Try a different browser (Chrome, Firefox, or Safari)';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied.\n\n' +
          'To allow microphone access:\n' +
          '1. Click the lock/info icon in your browser\'s address bar\n' +
          '2. Find "Microphone" and change it to "Allow"\n' +
          '3. Refresh the page and try again\n\n' +
          'Or check your browser settings:\n' +
          '• Chrome: Settings → Privacy and security → Site settings → Microphone\n' +
          '• Firefox: Preferences → Privacy & Security → Permissions → Microphone\n' +
          '• Safari: Preferences → Websites → Microphone';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found.\n\n' +
          'Please connect a microphone or headset and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Microphone is being used by another application.\n\n' +
          'Please close other applications using your microphone and try again.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Microphone does not meet requirements.\n\n' +
          'Please try a different microphone or check your device settings.';
      }
      
      alert(errorMessage);
      
      // Clean up on error
      if (peerConnection) {
        peerConnection.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [endCall]);

  const handleSelectContact = (contactId) => {
    setSelectedContactId(contactId);
    setView('chat');
  };

  const handleBackToContacts = () => {
    setSelectedContactId(null);
    setView('contacts');
  };

  const handleSignOut = () => {
    setUser(null);
    setView('auth');
    setSelectedContactId(null);
    setCurrentCall(null);
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading-screen">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App">
        <Auth onAuthSuccess={(userData) => {
          setUser(userData);
          setView('contacts');
        }} />
      </div>
    );
  }

  // Debug: Log render state
  if (user) {
    console.log('App render - incomingCall:', !!incomingCall, incomingCall?.callerId, 'currentCall:', !!currentCall, 'view:', view);
  }

  return (
    <div className="App">
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
      ) : view === 'profile' ? (
        <div className="app-container">
          <UserProfile
            user={user}
            onSignOut={handleSignOut}
            onBack={() => setView('contacts')}
          />
        </div>
      ) : (
        <div className="app-container desktop-layout">
          <div className="sidebar">
            <div className="sidebar-header">
              <h1>Thon</h1>
              <div className="header-right">
                <div className="header-right-top">
                  <div className="connection-status" title={`Server: ${wsUrl} - ${connectionStatus} - User: ${user.uid}`}>
                    <span className={`status-indicator ${connectionStatus}`}></span>
                    <span className="status-text">
                      {connectionStatus === 'connected' ? 'Connected' : 
                       connectionStatus === 'connecting' ? 'Connecting...' : 
                       connectionStatus === 'error' ? 'Error' : 'Disconnected'}
                    </span>
                    {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                      <button
                        className="reconnect-button"
                        onClick={handleReconnect}
                        title={`Reconnect to ${wsUrl}`}
                      >
                        🔄
                      </button>
                    )}
                  </div>
                  <button
                    className="profile-button"
                    onClick={() => setView('profile')}
                    title="Profile"
                  >
                    👤
                  </button>
                </div>
                {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                  <div className="connection-help" style={{fontSize: '0.7rem', opacity: 0.8, padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', textAlign: 'right'}}>
                    {wsUrl.includes('localhost') ? '⚠️ Use server IP if on different machine' : `Server: ${wsUrl.split('://')[1]}`}
                  </div>
                )}
              </div>
            </div>
            <ContactsList
              currentUser={user}
              onSelectContact={handleSelectContact}
              onStartCall={(contactId) => {
                startCall(contactId);
              }}
            />
          </div>
          <div className="main-content">
            {view === 'chat' && selectedContactId ? (
              <ChatView
                userId={selectedContactId}
                onBack={handleBackToContacts}
                onStartCall={(contactId) => {
                  startCall(contactId);
                }}
                currentUser={user}
              />
            ) : (
              <div className="empty-chat-view">
                <div>
                  <h2>Welcome to Thon</h2>
                  <p>Select a contact to start chatting</p>
                </div>
              </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}

export default App;
