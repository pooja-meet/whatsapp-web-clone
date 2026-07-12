import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoClose } from 'react-icons/io5';

export default function ContactsModal({ api_url, onClose, onSelectContact }) {
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAllContacts = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                // Ek aisa backend endpoint jahan se saare app users mil sakein
                const res = await axios.get(`${api_url}/api/chat/all-users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAllUsers(res.data);
            } catch (err) {
                console.error("Contacts load karne me dikkat aayi:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllContacts();
    }, [api_url]);

    return (
        <div className="contacts_overlay">
            <div className="contacts_container">
                <div className="contacts_header">
                    <h3>New Chat</h3>
                    <button className="close_btn" onClick={onClose}><IoClose size={24} /></button>
                </div>

                <div className="contacts_list">
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '20px' }}>Loading contacts...</p>
                    ) : allUsers.length > 0 ? (
                        allUsers.map((user) => (
                            <div 
                                key={user._id} 
                                className="contact_card" 
                                onClick={() => onSelectContact(user)}
                            >
                                <img 
                                    src={user.image?.url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                                    alt={user.name} 
                                    className="contact_avatar"
                                />
                                <div className="contact_info">
                                    <h4>{user.name}</h4>
                                    <p>{user.about || "Hey there! I am using WhatsApp."}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', padding: '20px', color: '#8696a0' }}>No contacts found</p>
                    )}
                </div>
            </div>
        </div>
    );
}