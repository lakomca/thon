import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import './ChatView.css';

function ChatView({ userId, onBack, onStartCall, currentUser }) {
  const [userProfile, setUserProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const currentUserId = currentUser?.uid;

  // Generate chat ID (consistent order for both users)
  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  const chatId = currentUserId && userId ? getChatId(currentUserId, userId) : null;

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (userId && db) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  // Listen to messages in real-time
  useEffect(() => {
    if (!chatId || !db) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesList);
      
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    return () => unsubscribe();
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !chatId || !currentUserId || sending) return;

    setSending(true);
    try {
      // Ensure chat document exists
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        // Create chat document with participants
        await setDoc(chatRef, {
          participants: [currentUserId, userId].sort(),
          createdAt: serverTimestamp(),
          lastMessage: messageText.trim(),
          lastMessageTime: serverTimestamp()
        });
      } else {
        // Update last message info
        await setDoc(chatRef, {
          lastMessage: messageText.trim(),
          lastMessageTime: serverTimestamp()
        }, { merge: true });
      }

      // Add message to subcollection
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        text: messageText.trim(),
        senderId: currentUserId,
        receiverId: userId,
        timestamp: serverTimestamp(),
        read: false
      });

      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="chat-view">
        <div className="chat-loading">Loading...</div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="chat-view">
        <div className="chat-error">User not found</div>
      </div>
    );
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <button className="back-button desktop-hidden" onClick={onBack}>
          ←
        </button>
        <div className="chat-header-info">
          <div className="chat-avatar">
            {userProfile.avatar ? (
              <img src={userProfile.avatar} alt={userProfile.name} />
            ) : (
              <span>{getInitials(userProfile.name)}</span>
            )}
          </div>
          <div className="chat-header-text">
            <h2>{userProfile.name}</h2>
            <p className="chat-status">{userProfile.status}</p>
          </div>
        </div>
        <button className="call-button-header" onClick={() => onStartCall(userId)}>
          📞
        </button>
      </div>

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet</p>
            <p className="chat-empty-hint">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSent = message.senderId === currentUserId;
            return (
              <div key={message.id} className={`message ${isSent ? 'message-sent' : 'message-received'}`}>
                <div className="message-content">
                  <p className="message-text">{message.text}</p>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={sendMessage} className="chat-input-form">
          <input
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="chat-input"
            disabled={sending}
          />
          <button 
            type="submit"
            className="chat-send-button"
            disabled={!messageText.trim() || sending}
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatView;
