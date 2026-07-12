import React, { useState, useEffect, useRef } from 'react';
import { IoVideocamOutline, IoCallOutline, IoArrowBack } from 'react-icons/io5'; // 🔥 IoArrowBack import kiya
import { TbDotsVertical } from 'react-icons/tb';

export default function ChatHeader({
  selectedUser,
  formatLastSeen,
  currentUser,
  onBlockUser,
  onClearChat,
  onBack // 🔥 Prop: Wapas jaane ka action run karne ke liye
}) {

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const isCurrentlyBlocked = currentUser?.blockedUsers?.includes(selectedUser?._id);
  const isDeactivatedUser = selectedUser?.name === "Deactivated User" || selectedUser?.isDeactivated;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="chat_header" ref={dropdownRef}>

      {/* LEFT SECTION: Back Arrow, Avatar and User Details */}
      <div className="chat_header_left_info">

        {/* 🔥 WhatsApp Left Arrow Button */}
        <button className="chat_header_back_btn" onClick={onBack} title="Back">
          <IoArrowBack size={22} />
        </button>

        <img
          src={selectedUser.image?.url || '/assets/profile.png'}
          alt={selectedUser.name}
          className="chat_header_img"
          onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; }}
        />
        <div>
          <h4>{selectedUser.name}</h4>
          <span className="user_header_status">
            {isDeactivatedUser
              ? "Account Deactivated"
              : selectedUser.isOnline
                ? "online"
                : selectedUser.lastSeen
                  ? `last seen ${formatLastSeen(selectedUser.lastSeen)}`
                  : "offline"
            }
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Video Call & Actions Menu */}
      <div className="chat_header_right_actions">
        <button className="header_action_btn" title="Audio Call" disabled={isDeactivatedUser}>
          <IoCallOutline size={22} style={{ opacity: isDeactivatedUser ? 0.4 : 1 }} />
        </button>
        <button className="header_action_btn" title="Video Call" disabled={isDeactivatedUser}>
          <IoVideocamOutline size={22} style={{ opacity: isDeactivatedUser ? 0.4 : 1 }} />
        </button>
        <button
          className={`header_action_btn ${showDropdown ? 'active_menu_btn' : ''}`}
          onClick={() => setShowDropdown(!showDropdown)}
          title="Menu"
        >
          <TbDotsVertical size={22} />
        </button>

        {/* Dropdown Overlay */}
        {showDropdown && (
          <div className="header_dropdown_popup">
            {!isDeactivatedUser && (
              <button
                onClick={() => {
                  onBlockUser?.(selectedUser._id);
                  setShowDropdown(false);
                }}
              >
                {isCurrentlyBlocked ? "Unblock User" : "Block User"}
              </button>
            )}

            <button
              className="dropdown_item clear_chat_btn"
              onClick={() => {
                onClearChat(selectedUser._id);
                setShowDropdown(false);
              }}
            >
              Clear Chat
            </button>
          </div>
        )}
      </div>

    </div>
  );
}