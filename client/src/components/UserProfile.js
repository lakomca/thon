import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import './UserProfile.css';

function UserProfile({ user, onSignOut, onBack }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setProfile(profileData);
          setName(profileData.name || '');
          setStatus(profileData.status || 'Available');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name,
        status: status,
        lastSeen: new Date().toISOString()
      });
      setProfile({ ...profile, name, status });
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return <div className="user-profile-loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="user-profile-error">Profile not found</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        {onBack && (
          <button className="profile-back-button" onClick={onBack} title="Back">
            ←
          </button>
        )}
        <div className="profile-avatar-large">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} />
          ) : (
            <span>{getInitials(profile.name)}</span>
          )}
        </div>
        <h2>{profile.name}</h2>
        <p className="profile-username">@{profile.username}</p>
        <p className="profile-number">#{profile.contactNumber}</p>
      </div>

      <div className="profile-content">
        {editing ? (
          <div className="profile-edit">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-input"
                placeholder="e.g., Available, Busy, Away"
              />
            </div>
            <div className="profile-actions">
              <button
                onClick={handleSave}
                disabled={saving}
                className="save-button"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(profile.name);
                  setStatus(profile.status);
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-view">
            <div className="profile-field">
              <label>Status</label>
              <p>{profile.status}</p>
            </div>
            <div className="profile-field">
              <label>Email</label>
              <p>{profile.email}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="edit-button"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="profile-footer">
        <button onClick={handleSignOut} className="signout-button">
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default UserProfile;

