const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);

// Enable CORS for Express
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store active connections
const clients = new Map();

// Serve static files from client build (for production)
app.use(express.static('../client/build'));

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  let clientId = null;

  socket.on('register', (data) => {
    try {
      // Check if client is already registered with this ID
      const requestedId = data.clientId || generateClientId();
      
      // If client already exists with this ID and it's a different connection, remove old one
      if (clients.has(requestedId) && clients.get(requestedId).id !== socket.id) {
        const oldSocket = clients.get(requestedId);
        oldSocket.disconnect();
        clients.delete(requestedId);
      }
      
      // Register client with an ID
      clientId = requestedId;
      clients.set(clientId, socket);
      socket.clientId = clientId;
      console.log(`Client registered: ${clientId} (Total: ${clients.size})`);
      
      socket.emit('registered', { clientId: clientId });
      
      // Send list of available clients after a small delay
      setTimeout(() => {
        broadcastClientList();
      }, 100);
    } catch (error) {
      console.error('Error processing register:', error);
    }
  });

  socket.on('call-request', (data) => {
    try {
      console.log(`[${clientId}] Forwarding call-request to ${data.targetId}`);
      forwardToClient(data.targetId, 'call-request', {
        callerId: clientId
      });
      console.log(`[${clientId}] Call-request forwarded successfully`);
    } catch (error) {
      console.error('Error forwarding call request:', error);
    }
  });

  socket.on('call-accept', (data) => {
    try {
      forwardToClient(data.targetId, 'call-accept', {
        answererId: clientId
      });
    } catch (error) {
      console.error('Error forwarding call accept:', error);
    }
  });

  socket.on('call-reject', (data) => {
    try {
      forwardToClient(data.targetId, 'call-reject', {
        rejecterId: clientId
      });
    } catch (error) {
      console.error('Error forwarding call reject:', error);
    }
  });

  socket.on('call-end', (data) => {
    try {
      forwardToClient(data.targetId, 'call-end', {
        senderId: clientId
      });
    } catch (error) {
      console.error('Error forwarding call-end:', error);
    }
  });

  // Forward WebRTC signaling messages
  socket.on('webrtc-offer', (data) => {
    try {
      forwardToClient(data.targetId, 'webrtc-offer', {
        offer: data.offer,
        senderId: clientId
      });
    } catch (error) {
      console.error('Error forwarding WebRTC offer:', error);
    }
  });

  socket.on('webrtc-answer', (data) => {
    try {
      forwardToClient(data.targetId, 'webrtc-answer', {
        answer: data.answer,
        senderId: clientId
      });
    } catch (error) {
      console.error('Error forwarding WebRTC answer:', error);
    }
  });

  socket.on('webrtc-ice-candidate', (data) => {
    try {
      forwardToClient(data.targetId, 'webrtc-ice-candidate', {
        candidate: data.candidate,
        senderId: clientId
      });
    } catch (error) {
      console.error('Error forwarding ICE candidate:', error);
    }
  });

  socket.on('disconnect', () => {
    if (clientId) {
      console.log(`Client disconnected: ${clientId} (Remaining: ${clients.size - 1})`);
      clients.delete(clientId);
      // Broadcast updated client list to remaining clients
      if (clients.size > 0) {
        broadcastClientList();
      }
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

function forwardToClient(targetId, eventType, message) {
  const targetSocket = clients.get(targetId);
  if (targetSocket && targetSocket.connected) {
    console.log(`Forwarding ${eventType} to ${targetId}`);
    targetSocket.emit(eventType, message);
  } else {
    console.log(`❌ Target client ${targetId} not found or not connected. Available clients:`, Array.from(clients.keys()));
  }
}

function broadcastClientList() {
  const clientList = Array.from(clients.keys());
  
  clients.forEach((socket, id) => {
    if (socket.connected) {
      socket.emit('client-list', { clients: clientList });
    }
  });
}

function generateClientId() {
  return `client_${Math.random().toString(36).substr(2, 9)}`;
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

server.listen(PORT, HOST, () => {
  const localIPs = getLocalIPs();
  console.log(`\n=== Signaling Server Started (Socket.io) ===`);
  console.log(`Server running on port ${PORT}`);
  console.log(`\nConnect from other devices using:`);
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`  - http://${ip}:${PORT}`);
    });
  } else {
    console.log(`  - http://localhost:${PORT} (local only)`);
    console.log(`  - Find your IP address and use: http://YOUR_IP:${PORT}`);
  }
  console.log(`================================\n`);
});
