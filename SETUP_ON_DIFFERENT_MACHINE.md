# Setting Up Server on Different Machine

This guide helps you set up the voice calling app server on a different machine, especially when port 3000 is already in use.

## Step 1: Copy Project to Other Machine

1. Copy the entire project folder to the other machine
2. Or clone/pull from git if using version control

## Step 2: Install Dependencies

On the other machine, run:
```bash
npm run install-all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

## Step 3: Configure Ports

Since port 3000 is already in use, we'll use different ports:

### Option A: Change React App Port (Recommended)

1. **Create/Edit `client/.env` file:**
```env
PORT=3002
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_WS_URL=ws://localhost:3001
```

2. **React will now run on port 3002** (or any port you choose)

### Option B: Change WebSocket Server Port

1. **Edit `server/index.js`** or set environment variable:
```bash
PORT=3003 npm run server
```

2. **Update `client/.env`:**
```env
REACT_APP_WS_URL=ws://localhost:3003
```

## Step 4: Start the Servers

On the other machine:

**Terminal 1 - WebSocket Server:**
```bash
npm run server
# Or with custom port:
PORT=3001 npm run server
```

**Terminal 2 - React App:**
```bash
npm run client
# Will use PORT from .env or default to 3000
```

## Step 5: Set Up ngrok Tunnels

Since you have ngrok on the other machine:

**Terminal 3 - ngrok for React App (port 3002):**
```bash
ngrok http 3002
```

**Terminal 4 - ngrok for WebSocket (port 3001):**
```bash
ngrok http 3001 --scheme=ws
```

## Step 6: Update Configuration

1. **Copy the ngrok HTTPS URLs:**
   - React app: `https://abc123.ngrok.io` (from Terminal 3)
   - WebSocket: `wss://xyz789.ngrok.io` (from Terminal 4)

2. **Update `client/.env` on the other machine:**
```env
REACT_APP_WS_URL=wss://xyz789.ngrok.io
PORT=3002
# ... other Firebase config
```

3. **Access the app:**
   - Use the React ngrok URL: `https://abc123.ngrok.io`
   - The WebSocket will automatically use the URL from `.env`

## Step 7: Access from Any Machine

Now both machines (and any other machine) can:
1. Access the app using the React ngrok HTTPS URL
2. The WebSocket connection will use the secure `wss://` URL
3. Microphone access will work because it's HTTPS

## Quick Reference

**On Server Machine (other machine):**
```bash
# Terminal 1
npm run server

# Terminal 2  
npm run client

# Terminal 3
ngrok http 3002

# Terminal 4
ngrok http 3001 --scheme=ws
```

**On Client Machines:**
- Access: `https://your-react-ngrok-url.ngrok.io`
- No `.env` changes needed (uses server's ngrok URLs)

## Troubleshooting

**Port already in use?**
- Change the port in `client/.env` (PORT=3002)
- Or kill the process using the port

**WebSocket not connecting?**
- Make sure ngrok is running for port 3001
- Check that `REACT_APP_WS_URL` uses `wss://` (secure WebSocket)
- Verify the ngrok URL is correct

**Microphone still not working?**
- Make sure you're using the HTTPS ngrok URL (not HTTP)
- Check browser console for errors
- Verify ngrok tunnel is active

