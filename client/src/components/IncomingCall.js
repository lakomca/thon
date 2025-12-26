import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './IncomingCall.css';

function IncomingCall({ callerId, onAccept, onReject }) {
  const [callerProfile, setCallerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('IncomingCall component mounted with callerId:', callerId);
  }, [callerId]);

  useEffect(() => {
    const fetchCallerProfile = async () => {
      try {
        if (callerId && db) {
          const userDoc = await getDoc(doc(db, 'users', callerId));
          if (userDoc.exists()) {
            setCallerProfile(userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching caller profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCallerProfile();
  }, [callerId]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = callerProfile?.name || 'Unknown User';
  const displayStatus = callerProfile?.status || 'Available';

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-container">
        <div className="caller-avatar">
          <div className="avatar-circle">
            {loading ? (
              <div className="loading-spinner"></div>
            ) : callerProfile?.avatar ? (
              <img src={callerProfile.avatar} alt={displayName} />
            ) : (
              <span>{getInitials(displayName)}</span>
            )}
          </div>
        </div>
        <div className="caller-info">
          <h2 className="caller-name">{displayName}</h2>
          <p className="caller-status">{displayStatus}</p>
          <p className="call-status">Incoming Call</p>
        </div>
        <div className="call-actions">
          <button className="reject-call-btn" onClick={onReject}>
            <span className="icon">✕</span>
            <span className="label">Decline</span>
          </button>
          <button className="accept-call-btn" onClick={onAccept}>
            <span className="icon">✓</span>
            <span className="label">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCall;

