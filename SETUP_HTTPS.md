# Setting Up HTTPS for Microphone Access

Browsers require HTTPS (or localhost) to access the microphone. If you're accessing the app via IP address (like `http://192.168.1.154:3000`), you need HTTPS.

## Quick Solutions

### Option 1: Use localhost on Server Machine (Easiest for Development)

**Both users access from the server machine:**
1. On the server machine, run: `npm run client`
2. Both users open their browsers on the server machine
3. Access: `http://localhost:3000`
4. This works without HTTPS!

**Note:** Both users need to be physically at the server machine or use remote desktop/SSH.

---

### Option 2: Use ngrok (Recommended for Testing)

ngrok creates a secure HTTPS tunnel to your local server.

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your React app:**
   ```bash
   cd client
   npm start
   # App runs on http://localhost:3000
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL:**
   - ngrok will show something like: `https://abc123.ngrok.io`
   - Use this URL on both machines instead of the IP address

5. **Update WebSocket URL:**
   - The WebSocket server still runs on port 3001
   - You'll need to tunnel that too, or use a different approach

**For WebSocket with ngrok:**
```bash
# Terminal 1: React app
npm run client

# Terminal 2: WebSocket server
npm run server

# Terminal 3: ngrok for React (port 3000)
ngrok http 3000

# Terminal 4: ngrok for WebSocket (port 3001)
ngrok http 3001 --scheme=ws
```

Then update `.env`:
```env
REACT_APP_WS_URL=wss://your-ws-ngrok-url.ngrok.io
```

---

### Option 3: Set Up SSL Certificate (For Production)

For a production setup, you'll need:
1. A domain name
2. SSL certificate (Let's Encrypt is free)
3. Reverse proxy (nginx or Apache)

This is more complex and typically for production deployments.

---

### Option 4: Use Cloudflare Tunnel (Alternative to ngrok)

1. Install Cloudflare Tunnel (cloudflared)
2. Create a tunnel
3. Configure it to forward to localhost:3000

---

## Recommended for Development

**For quick testing:** Use Option 1 (localhost on server machine)

**For remote testing:** Use Option 2 (ngrok) - it's free and easy

## Troubleshooting

**Still getting the error?**
- Make sure you're using the HTTPS URL (starts with `https://`)
- Check that ngrok is running
- Verify the WebSocket URL is also using `wss://` (secure WebSocket)
- Clear browser cache and try again

