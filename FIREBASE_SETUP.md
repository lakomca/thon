# Firebase Setup Guide

This guide will help you set up Firebase for the Thon web app.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. Enable Google Analytics (optional)

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click **Get Started**
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click **Save**

## Step 3: Enable Firestore Database

1. In your Firebase project, go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location for your database
5. Click **Enable**

## Step 4: Set Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow users to read any user profile
      allow read: if request.auth != null;
      // Allow users to write only their own profile
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /chats/{chatId} {
      // Allow users to read chats they're part of
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      // Allow users to create chats they're part of
      allow create: if request.auth != null && 
        request.auth.uid in request.resource.data.participants;
      // Allow users to update chats they're part of
      allow update: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      // Messages subcollection
      match /messages/{messageId} {
        // Allow users to read messages in chats they're part of
        allow read: if request.auth != null;
        // Allow users to create messages if they're the sender
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.senderId;
      }
    }
  }
}
```

3. Click **Publish**

## Step 5: Get Firebase Configuration

1. In your Firebase project, click the gear icon ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Scroll down to **Your apps** section
4. If you don't have a web app, click **</>** (Web) icon to add one
5. Register your app with a nickname (e.g., "Thon Web App")
6. Copy the Firebase configuration object

## Step 6: Configure Environment Variables

1. In the `client/` directory, create a `.env` file:

```bash
cd client
touch .env
```

2. Add your Firebase configuration to `.env`:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_WS_URL=ws://localhost:3001
```

Replace the values with your actual Firebase configuration values.

## Step 7: Install Dependencies

```bash
# From the project root
npm run install-all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

## Step 8: Run the Application

```bash
# From the project root
npm run dev
```

The app should now work with Firebase authentication and Firestore!

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure your `.env` file is in the `client/` directory
- Restart the React development server after creating/editing `.env`
- Check that all environment variables start with `REACT_APP_`

### "Permission denied" errors in Firestore
- Check your Firestore security rules
- Make sure you're authenticated (signed in)
- Verify the rules allow read access for authenticated users

### Users not appearing in contacts
- Make sure users have created accounts and profiles
- Check the browser console for errors
- Verify Firestore rules allow reading user documents

## Production Considerations

For production deployment:

1. **Update Firestore Rules**: Make them more restrictive based on your needs
2. **Enable Firebase Hosting**: Use `firebase deploy` to host your app
3. **Set up TURN servers**: For better WebRTC connectivity
4. **Configure CORS**: If hosting WebSocket server separately
5. **Environment Variables**: Use Firebase Functions or your hosting platform's environment variable system

