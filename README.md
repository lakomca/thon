# Thon - WhatsApp-like Web App

A modern web application similar to WhatsApp with voice calling, user authentication, contacts, and chat interface.

## Features

- 🔐 **Email/Username Authentication** - Sign up and sign in with email and username
- 👥 **User Profiles** - Name, avatar, status, and random number-based contacts
- 🔍 **Username Search** - Search for users by username, name, or contact number
- 💬 **Chat Interface** - Individual chat view (messaging coming soon)
- 📞 **Voice Calling** - Real-time peer-to-peer voice calls using WebRTC
- 🎨 **Modern UI** - Beautiful purple/indigo theme with responsive design
- 🔄 **Real-time Updates** - WebSocket for instant delivery and Firebase for data storage

## Tech Stack

- **Frontend**: React 18
- **Backend**: Node.js with WebSocket (Express)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Real-time**: WebSocket + Firebase Realtime Database
- **Voice**: WebRTC

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password provider)
3. Enable **Firestore Database**
4. Get your Firebase configuration from Project Settings

### Installation

1. **Install all dependencies:**
```bash
npm run install-all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

2. **Configure Firebase:**
   - Copy `.env.example` to `.env` in the `client/` directory:
   ```bash
   cd client
   cp .env.example .env
   ```
   - Edit `.env` and add your Firebase configuration:
   ```env
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   REACT_APP_WS_URL=ws://localhost:3001
   # If connecting from a different machine, use the server IP:
   # REACT_APP_WS_URL=ws://192.168.1.154:3001
   ```
   
   **Note:** If you're running the client on a different machine than the server, replace `localhost` with the server's IP address. See `CONNECTING_FROM_DIFFERENT_MACHINE.md` for detailed instructions.

3. **Firestore Security Rules:**
   Add these rules to your Firestore database:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

### Running the Application

1. **Start both server and client:**
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

### Using the App

1. **Sign Up/In:**
   - Create an account with email, username, and password
   - Or sign in with existing credentials

2. **Profile:**
   - View and edit your profile (name, status)
   - Each user gets a random 6-digit contact number

3. **Contacts:**
   - Browse all available users
   - Search by username, name, or contact number
   - Click on a contact to view their chat

4. **Voice Calls:**
   - Click the call button (📞) next to any contact
   - Accept incoming calls when prompted
   - Grant microphone permissions when asked

## Project Structure

```
thon/
├── server/
│   ├── index.js          # WebSocket signaling server
│   └── package.json
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── Auth.js   # Authentication component
│   │   │   ├── ContactsList.js  # Contacts list
│   │   │   ├── ChatView.js     # Chat interface
│   │   │   ├── UserProfile.js  # User profile
│   │   │   └── CallInterface.js # Voice call UI
│   │   ├── firebase.js   # Firebase configuration
│   │   ├── App.js        # Main app component
│   │   └── index.js
│   ├── .env.example      # Environment variables example
│   └── package.json
├── firebase.json         # Firebase hosting config
└── package.json
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may require additional configuration)

## Notes

- Microphone permissions are required for voice calls
- Works best on local network or with proper STUN/TURN server configuration for external networks
- For production, consider using TURN servers for better connectivity behind firewalls
- The WebSocket server needs to be hosted separately for production (Firebase Hosting only serves static files)

## Future Enhancements

- ✉️ Messaging functionality
- 📸 Media sharing (images, videos, files)
- 🎤 Voice messages
- 👥 Group chats
- 📱 Status/stories
- 🔔 Push notifications
- 🔍 Message search
- ✏️ Message editing/deletion

## License

MIT
