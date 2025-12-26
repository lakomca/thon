# Connecting from a Different Machine

If you're running the client on a different machine than the server, you need to update the WebSocket URL to use the server's IP address instead of `localhost`.

## Quick Fix

1. **Find the server machine's IP address** (ask the server admin or check the server terminal)

2. **On the client machine**, edit the `.env` file in the `client/` directory

3. **Change this line:**
   ```env
   REACT_APP_WS_URL=ws://localhost:3001
   ```
   
   **To this (replace with actual server IP):**
   ```env
   REACT_APP_WS_URL=ws://192.168.1.154:3001
   ```

4. **Restart the React development server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm start
   # or
   npm run client
   ```

## Current Server IP

**Server IP Address:** `192.168.1.154`

So your `.env` file should have:
```env
REACT_APP_WS_URL=ws://192.168.1.154:3001
```

## Verify Connection

After updating and restarting:
1. Check the connection status indicator in the app (top right of sidebar)
2. It should show "Connected" (green) instead of "Disconnected" (red)
3. Check the browser console - you should see "=== WEBSOCKET CONNECTED SUCCESSFULLY ==="

## Troubleshooting

**Still showing "Disconnected"?**

1. **Check the server is running:**
   - On the server machine, run: `npm run server`
   - You should see: "Signaling server running on port 3001"

2. **Check firewall settings:**
   - The server machine's firewall must allow connections on port 3001
   - On macOS: System Preferences → Security & Privacy → Firewall → Firewall Options

3. **Verify the IP address:**
   - Make sure you're using the correct IP address
   - The IP should be the server machine's local network IP (usually starts with 192.168.x.x or 10.x.x.x)

4. **Check network:**
   - Both machines must be on the same network (same WiFi/router)
   - If on different networks, you'll need to set up port forwarding or use a different solution

5. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for WebSocket connection errors
   - The error message will tell you what's wrong

## Example .env File for Client on Different Machine

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_WS_URL=ws://192.168.1.154:3001
```

## Finding the Server IP (for Server Admin)

If you need to find the server's IP address, on the server machine run:

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

