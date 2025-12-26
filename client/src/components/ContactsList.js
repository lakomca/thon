import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import './ContactsList.css';

function ContactsList({ currentUser, onSelectContact, onStartCall }) {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        if (searchQuery.trim()) {
          // Get all users and filter client-side (simpler, works without indexes)
          const allUsersQuery = query(collection(db, 'users'));
          const snapshot = await getDocs(allUsersQuery);
          
          const searchLower = searchQuery.toLowerCase().trim();
          const allUsers = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(user => {
              if (user.id === currentUser.uid) return false;
              
              // Filter by username, name, or contact number
              const matchesUsername = user.username?.toLowerCase().includes(searchLower);
              const matchesName = user.name?.toLowerCase().includes(searchLower);
              const matchesNumber = user.contactNumber?.includes(searchQuery.trim());
              
              return matchesUsername || matchesName || matchesNumber;
            })
            .slice(0, 50); // Limit to 50 results

          setContacts(allUsers);
        } else {
          // Get all users (limit to recent ones for performance)
          const allUsersQuery = query(
            collection(db, 'users')
          );
          
          const snapshot = await getDocs(allUsersQuery);
          const allUsers = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(user => user.id !== currentUser.uid)
            .sort((a, b) => {
              // Sort by lastSeen if available
              if (a.lastSeen && b.lastSeen) {
                return new Date(b.lastSeen) - new Date(a.lastSeen);
              }
              return 0;
            })
            .slice(0, 50); // Limit to 50 users

          setContacts(allUsers);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [searchQuery, currentUser.uid]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="contacts-list">
      <div className="contacts-header">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="contacts-loading">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="contacts-empty">
          <p>{searchQuery ? 'No contacts found' : 'No contacts available'}</p>
        </div>
      ) : (
        <div className="contacts-items">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="contact-item"
              onClick={() => onSelectContact(contact.id)}
            >
              <div className="contact-avatar">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} />
                ) : (
                  <span>{getInitials(contact.name)}</span>
                )}
              </div>
              <div className="contact-info">
                <div className="contact-name">{contact.name}</div>
                <div className="contact-details">
                  <span className="contact-username">@{contact.username}</span>
                  <span className="contact-number">#{contact.contactNumber}</span>
                </div>
                <div className="contact-status">{contact.status}</div>
              </div>
              <button
                className="contact-call-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartCall(contact.id);
                }}
                title="Call"
              >
                📞
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContactsList;

