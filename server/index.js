const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store active connections
const clients = new Map();

// Serve static files from client build (for production)
app.use(express.static('../client/build'));

wss.on('connection', (ws, req) => {
  console.log('New client connected');
  
  let clientId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'register':
          // Register client with an ID
          clientId = data.clientId || generateClientId();
          clients.set(clientId, ws);
          ws.clientId = clientId;
          console.log(`Client registered: ${clientId}`);
          
          ws.send(JSON.stringify({
            type: 'registered',
            clientId: clientId
          }));
          
          // Send list of available clients
          broadcastClientList();
          break;
          
        case 'offer':
          // Forward offer to target client
          console.log(`[${clientId}] Forwarding offer to ${data.targetId}`);
          console.log(`Available clients:`, Array.from(clients.keys()));
          if (!clientId) {
            console.error('Cannot forward offer: sender not registered');
            break;
          }
          forwardToClient(data.targetId, {
            type: 'offer',
            offer: data.offer,
            callerId: clientId
          });
          break;
          
        case 'answer':
          // Forward answer to caller
          console.log(`[${clientId}] Forwarding answer to ${data.targetId}`);
          forwardToClient(data.targetId, {
            type: 'answer',
            answer: data.answer,
            answererId: clientId
          });
          break;
          
        case 'ice-candidate':
          // Forward ICE candidate to peer
          forwardToClient(data.targetId, {
            type: 'ice-candidate',
            candidate: data.candidate,
            senderId: clientId
          });
          break;
          
        case 'call-end':
          // Notify peer that call ended
          forwardToClient(data.targetId, {
            type: 'call-end',
            senderId: clientId
          });
          break;
          
        case 'call-rejected':
          // Notify caller that call was rejected
          console.log(`[${clientId}] Forwarding call rejection to ${data.targetId}`);
          forwardToClient(data.targetId, {
            type: 'call-rejected',
            rejecterId: clientId,
            reason: data.reason || 'User is busy'
          });
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    if (clientId) {
      clients.delete(clientId);
      broadcastClientList();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function forwardToClient(targetId, message) {
  const targetWs = clients.get(targetId);
  if (targetWs && targetWs.readyState === WebSocket.OPEN) {
    targetWs.send(JSON.stringify(message));
    console.log(`✓ Message forwarded to ${targetId}:`, message.type);
  } else {
    console.error(`✗ Target client ${targetId} not found or not connected.`);
    console.error(`  Available clients:`, Array.from(clients.keys()));
    console.error(`  Target WS exists:`, !!targetWs);
    if (targetWs) {
      console.error(`  Target WS readyState:`, targetWs.readyState, '(1=OPEN, 2=CLOSING, 3=CLOSED)');
    }
  }
}

function broadcastClientList() {
  const clientList = Array.from(clients.keys());
  const message = JSON.stringify({
    type: 'client-list',
    clients: clientList
  });
  
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function generateClientId() {
  return `client_${Math.random().toString(36).substr(2, 9)}`;
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

server.listen(PORT, HOST, () => {
  console.log(`Signaling server running on ${HOST}:${PORT}`);
  console.log(`Server is accessible at ws://localhost:${PORT} (same machine)`);
  console.log(`Server is accessible at ws://192.168.1.154:${PORT} (other machines on network)`);
});

