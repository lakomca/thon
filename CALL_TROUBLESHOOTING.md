# Call Troubleshooting Guide

If users are unable to call each other, check the following:

## 1. WebSocket Server Status

**Make sure the WebSocket server is running:**

```bash
# From the project root
npm run server
```

Or manually:
```bash
cd server
node index.js
```

The server should show:
```
Signaling server running on port 3001
```

## 2. Check WebSocket Connection

- Open browser console (F12)
- Look for: "Connected to signaling server"
- Look for: "Registered with signaling server"
- If you see "WebSocket connection failed", the server is not running

## 3. Verify User Registration

When a user signs in, they should:
1. Connect to WebSocket server
2. Register with their Firebase user ID
3. See "Registered with signaling server" in console

## 4. Check Browser Console

When making a call, you should see:
- "Starting call to: [userId]"
- "Sending offer to: [userId]"
- "Received offer from: [callerId]" (on recipient side)
- "Sending answer to caller: [callerId]"
- "Received answer from: [answererId]" (on caller side)

## 5. Common Issues

### Issue: "Not connected to server"
**Solution:** 
- Make sure the WebSocket server is running on port 3001
- Check that `REACT_APP_WS_URL` in `.env` is correct
- Restart both client and server

### Issue: "Target client not found or not connected"
**Solution:**
- Both users must be signed in and connected
- Check that both users see "Connected" status
- Verify the target user ID is correct

### Issue: "Microphone permission denied"
**Solution:**
- Allow microphone access in browser settings
- Check browser permissions for the site
- Try refreshing the page

### Issue: Call connects but no audio
**Solution:**
- Check microphone is working (test in other apps)
- Check browser audio settings
- Verify STUN servers are accessible
- For production, you may need TURN servers

## 6. Server Logs

Check the server console for:
- Client registration messages
- Offer/answer forwarding messages
- Any error messages

## 7. Network Issues

If calls work on localhost but not across networks:
- You need TURN servers for NAT traversal
- STUN servers (Google's) work for most cases
- For production, set up your own TURN server

## 8. Testing Steps

1. **Start the server:**
   ```bash
   npm run server
   ```

2. **Open two browser windows:**
   - Window 1: Sign in as User A
   - Window 2: Sign in as User B

3. **Check connection status:**
   - Both should show "Connected" in console
   - Both should be registered

4. **Make a call:**
   - User A clicks call button next to User B
   - User B should see incoming call screen
   - User B accepts
   - Both should see "Call in Progress"

5. **Check audio:**
   - Both users should hear each other
   - Check microphone permissions if not working

## 9. Debug Mode

Enable detailed logging by checking browser console:
- All WebSocket messages are logged
- All peer connection states are logged
- Errors are logged with details

## 10. Firewall/Network

If calls don't work:
- Check firewall allows WebSocket connections
- Check if port 3001 is accessible
- For production, use HTTPS/WSS instead of HTTP/WS

