# Voice WebApp

A web application with voice calling feature using WebRTC.

## Features

- Real-time peer-to-peer voice calling
- WebSocket-based signaling server
- Modern, responsive UI
- Multiple client support

## How It Works

1. **WebRTC**: Uses WebRTC API for peer-to-peer audio communication
2. **Signaling Server**: Node.js WebSocket server handles call setup (offers, answers, ICE candidates)
3. **STUN Servers**: Uses Google's public STUN servers for NAT traversal

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install all dependencies:
```bash
npm run install-all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### Running the Application

1. Start both server and client:
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Start signaling server
npm run server

# Terminal 2 - Start React client
npm run client
```

2. The signaling server will run on `http://localhost:3001`
3. The React app will open in your browser at `http://localhost:3000`

### Testing Voice Calls

1. Open the app in two different browser tabs/windows (or different browsers)
2. Each instance will get a unique client ID
3. Click "Call" next to another user's ID to start a call
4. Accept the call when prompted
5. Grant microphone permissions when asked
6. You should now be able to hear each other!

## Project Structure

```
voice-webapp/
├── server/
│   ├── index.js          # WebSocket signaling server
│   └── package.json
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── App.js        # Main app component
│   │   └── index.js
│   └── package.json
└── package.json
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may require additional configuration)

## Notes

- Microphone permissions are required
- Works best on local network or with proper STUN/TURN server configuration for external networks
- For production, consider using TURN servers for better connectivity behind firewalls

## Future Enhancements

- Video calling support
- Call history
- Contact management
- Group calls
- Call recording
- Better error handling and reconnection logic

