# Architecture Overview

## How It Works

This application has a **client-server architecture**:

### Server (WebSocket Signaling Server)
- **Runs on ONE machine** (the "server machine")
- Handles WebSocket connections for call signaling
- Routes messages between clients (offers, answers, ICE candidates)
- **Location**: `server/` directory
- **Command**: `npm run server` (on the server machine)

### Clients (React Web Apps)
- **Can run on ANY machine(s)** - same as server or different machines
- Each user opens the app in their browser
- Connects to the WebSocket server for voice calls
- Uses Firebase for authentication and messaging
- **Location**: `client/` directory
- **Command**: `npm run client` (on each client machine, or all can run on the server machine)

## Setup Scenarios

### Scenario 1: Everything on One Machine (Development)
```
Server Machine:
  - Run: npm run server (WebSocket server)
  - Run: npm run client (React app)
  - Access: http://localhost:3000
  - WebSocket URL: ws://localhost:3001
```

### Scenario 2: Server on One Machine, Clients on Different Machines
```
Server Machine (192.168.1.154):
  - Run: npm run server
  - WebSocket URL: ws://192.168.1.154:3001

Client Machine 1:
  - Run: npm run client
  - .env: REACT_APP_WS_URL=ws://192.168.1.154:3001
  - Access: http://localhost:3000

Client Machine 2:
  - Run: npm run client
  - .env: REACT_APP_WS_URL=ws://192.168.1.154:3001
  - Access: http://localhost:3000
```

### Scenario 3: All on Server Machine (Multiple Browser Tabs)
```
Server Machine:
  - Run: npm run server
  - Run: npm run client
  - Open browser tab 1: http://localhost:3000 (User 1)
  - Open browser tab 2: http://localhost:3000 (User 2)
  - Both connect to: ws://localhost:3001
```

## Key Points

1. **Only ONE server is needed** - The WebSocket server runs on one machine
2. **Clients can be anywhere** - Each user can run the React app on their own machine
3. **All clients connect to the same server** - They use the server's IP address in their `.env` file
4. **Firebase is cloud-based** - Authentication and messaging work from any machine (no server needed for these)

## Network Requirements

- All machines must be on the **same network** (same WiFi/router) for local IP addresses to work
- The server machine's firewall must allow connections on port 3001
- If machines are on different networks, you'll need port forwarding or a different solution

## Current Setup

**Server Machine IP:** `192.168.1.154`
**Server Port:** `3001`

**For clients on the server machine:**
```env
REACT_APP_WS_URL=ws://localhost:3001
```

**For clients on other machines:**
```env
REACT_APP_WS_URL=ws://192.168.1.154:3001
```

