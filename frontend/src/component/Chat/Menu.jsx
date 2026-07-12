import { useState, useRef, useEffect } from "react";
import { TbDotsVertical } from "react-icons/tb";
import { LuLogOut, LuUser, LuSettings } from "react-icons/lu";

export default function Menu({ log, setActiveTab }) { // 🔥 Added setActiveTab prop
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="menu-wrapper" ref={menuRef}>
      <TbDotsVertical
        size={28}
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((prev) => !prev)}
      />

      {open && (
        <div className="menu-dropdown">
          {/* 🔥 Click karte hi left sidebar me profile section open ho jayega */}
          <button
            onClick={() => {
              setOpen(false);
              setActiveTab('profile');
            }}
          >
            <LuUser /> Profile
          </button>

          {/* 🔥 Settings tab par switch karne ke liye */}
          <button
            onClick={() => {
              setOpen(false);
              setActiveTab('settings');
            }}
          >
            <LuSettings /> Settings
          </button>

          <button
            onClick={() => {
              setOpen(false);
              log();
            }}
          >
            <LuLogOut /> Logout
          </button>
        </div>
      )}
    </div>
  );
}