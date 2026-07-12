import React from 'react';
import { BsChatSquareText } from 'react-icons/bs';
import { IoCallOutline, IoSettingsOutline } from 'react-icons/io5';
import { TbCircleDashed } from 'react-icons/tb'
export default function SideNav({ currentUser, activeTab, setActiveTab }) {
  return (
    <div className="sidebar_nav">

      {/* 1. TOP SECTION: Menu Icons */}
      <div className="sidebar_nav_menu">
        {/* Chat Icon */}
        <button
          className={`nav_icon_btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
          title="Chats"
        >
          <BsChatSquareText size={22} />
        </button>

        {/* Status Icon */}
        <button
          className={`nav_icon_btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
          title="Status"
        >
          <TbCircleDashed size={22} className="status_icon" />

        </button>

        {/* Calls Icon */}
        <button
          className={`nav_icon_btn ${activeTab === 'calls' ? 'active' : ''}`}
          onClick={() => setActiveTab('calls')}
          title="Calls"
        >
          <IoCallOutline size={24} />
        </button>
      </div>

      {/* 2. BOTTOM SECTION: Settings aur Profile Pic */}
      <div className="sidebar_nav_bottom">
        {/* Settings Icon */}
        <button
          className={`nav_icon_btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title="Settings"
        >
          <IoSettingsOutline size={24} />
        </button>

        {/* User Profile Avatar */}
        <div
          className={`sidebar_profile_wrapper ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          title="Profile"
        >
          <img
            src={currentUser?.image?.url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
            alt="My Profile"
            className="sidebar_profile_img"
          />
        </div>
      </div>

    </div>
  );
}