import React from 'react';
import Menu from './Menu';
import { FiPlus } from "react-icons/fi";
import { RiChatNewFill } from "react-icons/ri";

export default function Sidebar({
    users,
    selectedUser,
    setSelectedUser,
    formatChatTime,
    log,
    onAddChatClick,
    setActiveTab
}) {

    // Helper function: Taki text message ke alawa Image/Video/Audio ka preview bhi real-time dikhe
    const renderLatestMessageContent = (latestMessage) => {
        if (!latestMessage) return "Tap to start chatting";

        if (latestMessage.messageType === "image") return "📷 Image";
        if (latestMessage.messageType === "video") return "🎥 Video";
        if (latestMessage.messageType === "audio") return "🎵 Audio";
        if (latestMessage.messageType === "document") return "📎 Document";

        const text = latestMessage.content || "";
        return text.length > 30 ? `${text.substring(0, 30)}...` : text;
    };

    return (
        <div className="chat_sidebar">

            {/* 1. SIDEBAR HEADER SECTION */}
            <div className="sidebar_header">
                <h3>Chats</h3>
                <div className="header_actions_right">
                    <button
                        className="header_action_icon_btn"
                        onClick={onAddChatClick}
                        title="New Chat"
                    >
                        <RiChatNewFill size={20} />
                    </button>
                    <div className="menu-wrapper">
                        <Menu className='menu' log={log} setActiveTab={setActiveTab} />
                    </div>
                </div>
            </div>

            {/* 2. CHAT LIST SECTION */}
            <div className="users_list">
                {users && users.length > 0 ? (
                    users.map((user) => {
                        // 🔥 CHECK: Agar chat open hai toh strict unread badge hide rakhenge
                        const isChatOpen = selectedUser?._id === user._id;
                        const numericUnreadCount = Number(user.unreadCount) || 0;

                        return (
                            <div
                                key={user._id}
                                className={`user_card ${isChatOpen ? "active_user" : ""}`}
                                onClick={() => setSelectedUser(user)}
                            >
                                <div className="user_avatar_container">
                                    <img
                                        src={user.image?.url || '/assets/profile.png'}
                                        alt={user.name}
                                        className="user_avatar_img"
                                        onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; }}
                                    />
                                    <span className={`status_badge_dot ${user.isOnline ? "online" : "offline"}`}></span>
                                </div>
                                <div className="user_info">
                                    <div className="user_top">
                                        <h4>{user.name}</h4>

                                        <span className="sidebar_time">
                                            {user.latestMessage?.createdAt &&
                                                formatChatTime(user.latestMessage.createdAt)}
                                        </span>
                                    </div>

                                    <div className="user_bottom">
                                        {/* Real-time media files text preview handles correctly */}
                                        <p className="sidebar_user_about">
                                            {renderLatestMessageContent(user.latestMessage)}
                                        </p>

                                        {/* 🔥 FIXED: Condition strictly explicitly type-check handles numeric and hides badge if open */}
                                        {!isChatOpen && numericUnreadCount > 0 && (
                                            <span className="unread_badge">
                                                {numericUnreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="no_users_found"
                        style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#8696a0'
                        }}>
                        <p>No chats found</p>
                        <span>
                            click on the <RiChatNewFill size={20} /> icon to view contact list
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}