import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessageArea from './MessageArea';
import ChatInput from './ChatInput';
import SideNav from './SideNav';
import ContactsModal from './ContactModal';
import { LuLogOut, LuArrowLeft, LuUserX, LuShieldAlert } from 'react-icons/lu';
import { BiCamera } from "react-icons/bi";
import './chat.css';

const api_url = import.meta.env.VITE_API_URL;
const socket = io(`${api_url}`, { autoConnect: true });

export default function Chat() {
  const navigate = useNavigate();

  const myId = localStorage.getItem("userId");
  const [isConnected, setIsConnected] = useState(socket.connected);

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [activeMenu, setActiveMenu] = useState('chats');
  const [showMenu, setShowMenu] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [showContacts, setShowContacts] = useState(false);

  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [file, setFile] = useState(null);

  // Profile Editing local states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const fileInputRef = useRef(null);
  const selectedUserRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Helper clear session function (Localhost me kuch nahi dikhne dega)
  const clearSessionAndRedirect = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    if (socket) socket.disconnect();
    navigate('/login');
  };

  // =========================================================================
  // 🛡️ AXIOS INTERCEPTOR: Token Expired hone par Localhost completely clean karega
  // =========================================================================
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          clearSessionAndRedirect();
        }
        return Promise.reject(error);
      }
    );

    // Clean up interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  // =========================================================================
  // 🔒 INITIAL ROUTE GUARD CHECK: Localhost open karte hi check karega
  // =========================================================================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      clearSessionAndRedirect();
    }
  }, [navigate]);

  // Socket Connections & Global Listeners
  useEffect(() => {
    if (myId) socket.emit("setup", myId);

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    function onMessageReceived(newMessageReceived) {
      const currentSelectedUser = selectedUserRef.current;
      const senderId = newMessageReceived.sender?._id || newMessageReceived.sender;
      const chatId = newMessageReceived.chat?._id || newMessageReceived.chat;

      const isChatOpen = currentSelectedUser && currentSelectedUser._id === senderId;

      if (isChatOpen) {
        const readMessage = { ...newMessageReceived, status: 'read' };
        setMessageList((prev) => [...prev, readMessage]);

        setUsers((prevUsers) => {
          const targetUser = prevUsers.find((u) => u._id === senderId);
          if (!targetUser) return prevUsers;

          const updatedUser = {
            ...targetUser,
            latestMessage: readMessage,
            unreadCount: 0
          };

          const remainingUsers = prevUsers.filter((u) => u._id !== senderId);
          return [updatedUser, ...remainingUsers];
        });

        const token = localStorage.getItem("token");
        axios.put(`${api_url}/api/chat/seen/${chatId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(() => {
          socket.emit("message_read", { chatId, senderId: currentSelectedUser._id });
        }).catch(err => console.error("Error updating seen on the fly", err));

      } else {
        setUsers((prevUsers) => {
          const targetUser = prevUsers.find((u) => u._id === senderId);
          if (!targetUser) return prevUsers;

          const updatedUser = {
            ...targetUser,
            latestMessage: newMessageReceived,
            unreadCount: (targetUser.unreadCount || 0) + 1
          };

          const remainingUsers = prevUsers.filter((u) => u._id !== senderId);
          return [updatedUser, ...remainingUsers];
        });
      }
    }

    function onMessageDelivered(data) {
      setMessageList((prevList) =>
        prevList.map((msg) =>
          msg._id === data.messageId && msg.status !== 'read'
            ? { ...msg, status: 'delivered' }
            : msg
        )
      );

      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user._id === data.receiverId && user.latestMessage && user.latestMessage._id === data.messageId) {
            return {
              ...user,
              latestMessage: { ...user.latestMessage, status: 'delivered' }
            };
          }
          return user;
        })
      );
    }

    function onMessagesMarkedRead(data) {
      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser && currentSelectedUser._id === data.senderId) {
        setMessageList((prev) =>
          prev.map((msg) => msg.status !== 'read' ? { ...msg, status: 'read' } : msg)
        );
      }

      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user._id === data.senderId && user.latestMessage) {
            return { ...user, latestMessage: { ...user.latestMessage, status: 'read' } };
          }
          return user;
        })
      );
    }

    function onUserStatusChange(data) {
      const { userId, isOnline, lastSeen } = data;
      setUsers((prevUsers) =>
        prevUsers.map((user) => user._id === userId ? { ...user, isOnline, lastSeen } : user)
      );

      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser && currentSelectedUser._id === userId) {
        setSelectedUser((prev) => prev ? { ...prev, isOnline, lastSeen } : null);
      }
    }

    function onBlockStatusUpdatedByPeer(data) {
      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser && currentSelectedUser._id === data.updaterId) {
        setSelectedUser((prev) => prev ? { ...prev, blockedUsers: data.updatedBlockedUsers } : null);
      }
      setUsers((prevUsers) =>
        prevUsers.map((u) => u._id === data.updaterId ? { ...u, blockedUsers: data.updatedBlockedUsers } : u)
      );
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message received', onMessageReceived);
    socket.on('message_delivered', onMessageDelivered);
    socket.on('user_status_change', onUserStatusChange);
    socket.on('messages_marked_read', onMessagesMarkedRead);
    socket.on('block_status_synced', onBlockStatusUpdatedByPeer);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message received");
      socket.off("message_delivered");
      socket.off("user_status_change");
      socket.off("messages_marked_read");
      socket.off("block_status_synced");
    };
  }, [myId]);

  const log = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post(`${api_url}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error("Logout API call failed:", error.response?.data?.message || error.message);
    } finally {
      clearSessionAndRedirect();
    }
  };

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    if (messageList.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageList]);

  const handleAccountDeactivation = async () => {
    const confirmFirst = window.confirm("Kya aap sach me apna account deactivate karna chahte hain?");
    if (!confirmFirst) return;

    const confirmSecond = window.prompt("Confirm karne ke liye apna register email id type karein:");
    if (confirmSecond !== currentUser?.email) {
      alert("Email match nahi hua. Deactivation cancelled.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${api_url}/api/auth/deactivate`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert("Aapka account successfully deactivate ho gaya hai.");
        clearSessionAndRedirect();
      }
    } catch (err) {
      console.error("Deactivation failed:", err);
      alert(err.response?.data?.msg || "Account deactivate karne me koi dikkat aayi.");
    }
  };

  const handleClearChat = async (targetUserId) => {
    const confirmClear = window.confirm("Kya aap is chat ke saare messages clear karna chahte hain?");
    if (!confirmClear) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.put(
        `${api_url}/api/chat/clear-chat/${targetUserId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessageList([]);
        setUsers((prevUsers) =>
          prevUsers.map((user) => {
            if (user._id === targetUserId) {
              return { ...user, latestMessage: null };
            }
            return user;
          })
        );
      }
    } catch (err) {
      console.error("Clear chat error:", err);
      alert(err.response?.data?.message || "Chat clear karne me koi dikkat aayi.");
    }
  };

  const handleDeleteMessageForMe = async (messageId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.put(`${api_url}/api/chat/message/delete-for-me/${messageId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessageList((prev) => prev.filter((msg) => msg._id !== messageId));
      }
    } catch (err) {
      console.error("Message deletion failed:", err);
      alert("Message delete nahi ho paya.");
    }
  };

  // Load Sidebar Users + Logged-in User Profile
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const usersRes = await axios.get(`${api_url}/api/chat/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(usersRes.data);

        const meRes = await axios.get(`${api_url}/api/chat/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentUser(meRes.data.user);

        setEditName(meRes.data.user?.name || "");
        setEditAbout(meRes.data.user?.about || "Available");
      } catch (err) {
        console.error("Data loading failed", err.response?.data || err.msg);
        if (err.response?.status === 401) clearSessionAndRedirect();
      }
    };
    fetchInitialData();
  }, []);

  // FETCH CHAT MESSAGES & CLEAR COUNTS ON CLICK
  useEffect(() => {
    if (!selectedUser?._id) return;

    const fetchMessagesAndMarkSeen = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${api_url}/api/chat/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessageList(res.data);

        setUsers((prevUsers) =>
          prevUsers.map((u) => u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u)
        );

        if (res.data.length > 0) {
          const chatId = res.data[0].chat?._id || res.data[0].chat;
          await axios.put(`${api_url}/api/chat/seen/${chatId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          socket.emit("join chat", chatId);
          socket.emit("message_read", { chatId, senderId: selectedUser._id });
        }
      } catch (err) {
        console.error("Messages load or seen update failed", err);
      }
    };
    fetchMessagesAndMarkSeen();
  }, [selectedUser?._id, myId]);

  const isBlockedByMe = currentUser?.blockedUsers?.includes(selectedUser?._id);
  const amIBlockedByThem = selectedUser?.blockedUsers?.includes(currentUser?._id);
  const isDeactivatedUser = selectedUser?.name === "Deactivated User";
  const isChatDisabled = isBlockedByMe || amIBlockedByThem || isDeactivatedUser;

  const blockPlaceholder = isDeactivatedUser
    ? "🚫 Aap is deactivated account ko message nahi bhej sakte."
    : isBlockedByMe
      ? "Aapne is user ko block kiya hai. Unblock karein."
      : "Aap is user ko message nahi bhej sakte.";

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!message.trim() && !file) || !selectedUser) return;
    if (isChatDisabled) return;

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("receiverId", selectedUser._id);
      if (message.trim()) formData.append("content", message);
      if (file) formData.append("file", file);

      const res = await axios.post(`${api_url}/api/chat`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessageList((prev) => {
        const exists = prev.some((m) => m._id === res.data._id);
        if (exists) return prev;
        return [...prev, res.data];
      });

      setUsers((prevUsers) => {
        const updated = prevUsers.map((u) =>
          u._id === selectedUser._id
            ? { ...u, latestMessage: res.data, unreadCount: 0 }
            : u
        );
        updated.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
        return updated;
      });

      socket.emit("new message", res.data);
      setMessage("");
      setFile(null);
    } catch (err) {
      console.error("Message send failed", err);
      alert(err.response?.data?.msg || "Failed to deliver message");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("about", editAbout);

      const res = await axios.put(`${api_url}/api/auth/update`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      if (res.data.success) {
        setCurrentUser(res.data.user);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Profile Text Update error:", err);
      alert(err.response?.data?.msg || "Failed to update profile text");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const fileSelected = e.target.files[0];
    if (!fileSelected) return;

    setProfileLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", fileSelected);

      const res = await axios.put(`${api_url}/api/auth/update`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      if (res.data.success) {
        setCurrentUser(res.data.user);
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
      alert("Failed to update profile image");
    } finally {
      setProfileLoading(false);
    }
  };

  const cancelProfileEdit = () => {
    setEditName(currentUser?.name || "");
    setEditAbout(currentUser?.about || "Available");
    setIsEditing(false);
  };

  const handleBlockToggle = async (targetUserId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.post(`${api_url}/api/auth/block-toggle`,
        { targetUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert(res.data.msg);

        setCurrentUser(prev => ({
          ...prev,
          blockedUsers: res.data.blockedUsers
        }));

        socket.emit("peer_block_event", {
          updaterId: myId,
          targetId: targetUserId,
          updatedBlockedUsers: res.data.blockedUsers
        });
      }
    } catch (err) {
      console.error("Block Toggle Error:", err);
      alert(err.response?.data?.msg || "Failed to alter block status");
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getDateLabel = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1, d2) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    if (isSameDay(messageDate, today)) return "Today";
    if (isSameDay(messageDate, yesterday)) return "Yesterday";

    const timeDiff = today.getTime() - messageDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (daysDiff >= 7) {
      return messageDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    }
    return messageDate.toLocaleDateString("en-US", { weekday: "long" });
  };

  const formatLastSeen = (isoString) => {
    if (!isoString) return "";
    const dateLabel = getDateLabel(isoString);
    const timeLabel = formatTime(isoString);
    if (dateLabel === "Today" || dateLabel === "Yesterday") {
      return `${dateLabel.toLowerCase()} at ${timeLabel}`;
    }
    return `on ${dateLabel} at ${timeLabel}`;
  };

  const formatChatTime = (isoString) => {
    if (!isoString) return "";
    const dateLabel = getDateLabel(isoString);
    if (dateLabel === "Today") return formatTime(isoString);
    if (dateLabel === "Yesterday") return "Yesterday";
    return dateLabel;
  };

  // Guard clause to handle unexpected rendering issues
  if (!localStorage.getItem("token")) {
    return null;
  }

  return (
    <div className="chat_page">
      <SideNav currentUser={currentUser} activeTab={activeMenu} setActiveTab={setActiveMenu} />

      {activeMenu === 'chats' && (
        <>
          <Sidebar
            users={users}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            formatChatTime={formatChatTime}
            onAddChatClick={() => setShowContacts(true)}
            log={log}
            setActiveTab={setActiveMenu}
          />

          <div className="chat_window">
            {selectedUser ? (
              <>
                <ChatHeader
                  selectedUser={selectedUser}
                  formatLastSeen={formatLastSeen}
                  currentUser={currentUser}
                  onBlockUser={handleBlockToggle}
                  onClearChat={handleClearChat}
                  onBack={() => setSelectedUser(null)}
                />
                <MessageArea messageList={messageList} myId={myId} formatTime={formatTime} getDateLabel={getDateLabel} messagesEndRef={messagesEndRef} />
                <ChatInput
                  message={message}
                  setMessage={setMessage}
                  sendMessage={sendMessage}
                  file={file}
                  setFile={setFile}
                  isChatDisabled={isChatDisabled}
                  blockPlaceholder={blockPlaceholder}
                />
              </>
            ) : (
              <div className="no_chat_selected">
                <div className="no_chat_icon_wrapper">💬</div>
                <h3>WhatsApp Web</h3>
                <p>Send and receive messages without keeping your phone online.</p>
              </div>
            )}
          </div>
        </>
      )}
      {activeMenu === 'status' && (
        <div className="whatsapp_side_panel_view">
          <div className="panel_header_section">
            <h3>Status</h3>
          </div>
          <div className="panel_content_placeholder">
            <div className="placeholder_icon">🟢</div>
            <h4>No Status Updates</h4>
            <p>Yahan aapke Status Schema se status render honge.</p>
          </div>
        </div>
      )}

      {activeMenu === 'calls' && (
        <div className="whatsapp_side_panel_view">
          <div className="panel_header_section">
            <h3>Calls</h3>
          </div>
          <div className="panel_content_placeholder">
            <div className="placeholder_icon">📞</div>
            <h4>No Call Logs</h4>
            <p>Yahan aapke Call Schema se logs fetch hoke dikhenge.</p>
          </div>
        </div>
      )}
      {activeMenu === 'settings' && (
        <>
          <div className="profile_sidebar_panel settings_sidebar_panel">
            <div className="profile_header_title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <LuArrowLeft size={22} style={{ cursor: 'pointer' }} onClick={() => setActiveMenu('chats')} />
              <h2>Settings</h2>
            </div>
            <div className="settings_content_wrapper" style={{ padding: '20px', overflowY: 'auto', height: 'calc(100% - 60px)' }}>
              <div className="settings_card_section" style={{ marginBottom: '25px' }}>
                <h3
                  style={{
                    color: '#00a884',
                    fontSize: '16px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center', gap: '8px'
                  }}>
                  <LuUserX size={18} /> Blocked Contacts ({currentUser?.blockedUsers?.length || 0})
                </h3>
                <div className="blocked_users_list" style={{ background: '#f0f2f5', borderRadius: '8px', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                  {currentUser?.blockedUsers && currentUser.blockedUsers.length > 0 ? (
                    users
                      .filter(u => currentUser.blockedUsers.includes(u._id))
                      .map(blockedUser => (
                        <div key={blockedUser._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid #e1e4e7' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={blockedUser?.image?.url || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            <span style={{ fontWeight: '500', fontSize: '14px' }}>{blockedUser.name}</span>
                          </div>
                          <button onClick={() => handleBlockToggle(blockedUser._id)} style={{ background: '#00a884', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Unblock</button>
                        </div>
                      ))
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#667781', textAlign: 'center', padding: '10px 0' }}>Koi bhi user block nahi hai.</p>
                  )}
                </div>
              </div>
              <div className="settings_card_section" style={{ borderTop: '1px solid #e9edef', paddingTop: '20px' }}>
                <h3 style={{ color: '#ea0038', fontSize: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LuShieldAlert size={18} /> Danger Zone
                </h3>
                <p style={{ fontSize: '13px', color: '#667781', marginBottom: '15px' }}>Agar aap apna account deactivate karte hain, toh aapka profile data permanent hide ho jayega aur pichli chats safe rahengi.</p>
                <button type="button" onClick={handleAccountDeactivation} style={{ width: '100%', background: '#ea0038', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>Deactivate Account</button>
              </div>
            </div>
          </div>
          <div className="chat_window">
            <div className="no_chat_selected">
              <div className="no_chat_icon_wrapper">⚙️</div>
              <h3>Settings Dashboard</h3>
              <p>Manage your privacy, blocked contacts, and account preferences.</p>
            </div>
          </div>
        </>
      )}

      {activeMenu === 'profile' && (
        <>
          <div className="profile_sidebar_panel">
            <div className="profile_header_title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <LuArrowLeft size={22} style={{ cursor: 'pointer' }} onClick={() => setActiveMenu('chats')} />
              <h2>Profile</h2>
            </div>
            <div className="profile_avatar_wrapper">
              <div className="avatar_hover_trigger" onClick={() => !profileLoading && fileInputRef.current.click()}>
                <img src={currentUser?.image?.url || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"} alt="Profile Avatar" className="profile_large_avatar" />
                <div className="avatar_overlay_mask">
                  <BiCamera size={24} color="#fff" />
                  <span>{profileLoading ? "UPLOADING..." : "CHANGE PROFILE PHOTO"}</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} style={{ display: "none" }} accept="image/*" />
            </div>
            <form className="profile_info_section" onSubmit={handleProfileUpdate}>
              <div className="profile_info_card">
                <label>Your name</label>
                <div className="profile_field_value">
                  {isEditing ?
                    <input type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="profile_edit_input" required />
                    : <h3>{currentUser?.name || "No Name Set"}</h3>}
                </div>
              </div>
              <div className="profile_info_card">
                <label>About</label>
                <div className="profile_field_value">
                  {isEditing ? <input type="text" value={editAbout} onChange={(e) => setEditAbout(e.target.value)} className="profile_edit_input" /> : <p>{currentUser?.about || "Available"}</p>}
                </div>
              </div>
              <div className="profile_info_card locked_field">
                <label>Email</label>
                <div className="profile_field_value"><p className="disabled_text_view">{currentUser?.email}</p></div>
              </div>
              <div className="profile_action_box">
                {isEditing ? (
                  <div className="edit_mode_actions">
                    <button type="submit" className="update_profile_btn save_action_btn" disabled={profileLoading}>{profileLoading ? "Saving..." : "Save Changes"}</button>
                    <button type="button" className="cancel_profile_btn" onClick={cancelProfileEdit} disabled={profileLoading}>Cancel</button>
                  </div>
                ) : (
                  <button type="button" className="update_profile_btn" onClick={() => setIsEditing(true)}>Update Profile</button>
                )}
              </div>
            </form>
          </div>
          <div className="chat_window">
            <div className="no_chat_selected">
              <div className="no_chat_icon_wrapper">💬</div>
              <h3>WhatsApp Web</h3>
              <p>Send and receive messages without keeping your phone online.</p>
            </div>
          </div>
        </>
      )}

      {showContacts && (
        <ContactsModal
          api_url={api_url}
          onClose={() => setShowContacts(false)}
          onSelectContact={(user) => {
            setSelectedUser(user);
            setUsers((prevUsers) => {
              const exists = prevUsers.some((u) => u._id === user._id);
              if (!exists) return [user, ...prevUsers];
              return prevUsers;
            });
            setShowContacts(false);
          }}
        />
      )}
    </div>
  );
}
