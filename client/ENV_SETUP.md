# Environment Variables Setup

## Quick Setup

1. **Create a `.env` file** in the `client/` directory (this file)

2. **Copy the template below** and replace with your Firebase values:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
REACT_APP_WS_URL=ws://localhost:3001
# For clients on different machines, use the server IP instead:
# REACT_APP_WS_URL=ws://192.168.1.154:3001
```

## How to Get Your Firebase Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll to **Your apps** section
5. Click on your web app (or create one)
6. Copy the values from the `firebaseConfig` object

## Example

Your Firebase config will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "my-project.firebaseapp.com",
  projectId: "my-project-id",
  storageBucket: "my-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

Convert it to `.env` format:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=my-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=my-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
REACT_APP_WS_URL=ws://localhost:3001
# For clients on different machines, use the server IP instead:
# REACT_APP_WS_URL=ws://192.168.1.154:3001
```

## Important Notes

- ⚠️ **Never commit `.env` to git** - it's already in `.gitignore`
- 🔄 **Restart the dev server** after creating/editing `.env`
- ✅ All variables must start with `REACT_APP_` to be accessible in React
- 📝 No quotes needed around values in `.env` files

## After Setup

1. Save the `.env` file
2. Stop your React dev server (Ctrl+C)
3. Restart it: `npm start` or `npm run client`
4. The app should now work!

## Troubleshooting

**Still getting 400 errors?**
- Check that all values are correct (no typos)
- Make sure there are no spaces around the `=` sign
- Verify your Firebase project has Authentication and Firestore enabled
- Check the browser console for specific error messages

