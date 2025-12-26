# Firebase Hosting Deployment Guide

## Prerequisites

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase project (if not already done):
   ```bash
   firebase init hosting
   ```
   - Select "Use an existing project" or create a new one
   - Set public directory to: `client/build`
   - Configure as single-page app: **Yes**
   - Set up automatic builds: **No** (we'll build manually)

## Configuration

The project is already configured with:
- `firebase.json` - Points to `client/build` directory
- `.firebaserc` - Update with your Firebase project ID

### Update Project ID

Edit `.firebaserc` and replace `"your-project-id"` with your actual Firebase project ID.

## Deployment Steps

1. **Build the React app:**
   ```bash
   npm run build
   ```
   This will create the production build in `client/build/`

2. **Deploy to Firebase:**
   ```bash
   firebase deploy --only hosting
   ```

## Important Notes

⚠️ **WebSocket Server**: Firebase Hosting only serves static files. Your WebSocket server (`server/index.js`) needs to be hosted separately. Options:

- **Firebase Functions** (with Express)
- **Cloud Run** (Google Cloud)
- **Heroku**, **Railway**, **Render**, or similar services
- **Your own server**

### Environment Variables

If your app needs environment variables, create a `.env.production` file in the `client/` directory:

```env
REACT_APP_SERVER_URL=https://your-websocket-server-url.com
```

Then rebuild:
```bash
npm run build
firebase deploy --only hosting
```

## Quick Deploy Script

You can add this to your `package.json` scripts:
```json
"deploy": "npm run build && firebase deploy --only hosting"
```

Then deploy with:
```bash
npm run deploy
```

