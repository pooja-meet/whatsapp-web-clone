import React, { useState, useEffect, useRef } from "react";
import { FaPaperclip, FaFile, FaXmark } from "react-icons/fa6";
import { BiImages, BiVolumeFull } from "react-icons/bi";

export default function ChatInput({
  message,
  setMessage,
  sendMessage,
  file,
  setFile,
  isChatDisabled,      // Parent se received disabled status
  blockPlaceholder,    // Parent se received conditional text warning
}) {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const menuRef = useRef(null);

  const imageVideoRef = useRef(null);
  const docRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setMediaPreviewUrl(null);
      return;
    }
    const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/") || file.type.startsWith("audio/");
    if (isMedia) {
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setMediaPreviewUrl(null);
    }
  }, [file]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setShowAttachmentMenu(false);
    e.target.value = "";
  };

  return (
    <div ref={menuRef} style={{ width: "100%", position: "relative" }}>

      {/* Media Previews */}
      {file && !isChatDisabled && (
        <div className="whatsapp_media_preview_overlay">
          <div className="document_preview_box">
            {file.type.startsWith("image/") && <img src={mediaPreviewUrl} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'cover' }} />}
            {file.type.startsWith("video/") && <video src={mediaPreviewUrl} style={{ maxWidth: '100px', maxHeight: '100px' }} />}
            {file.type.startsWith("audio/") && <BiVolumeFull size={40} />}
            {!file.type.startsWith("image/") && !file.type.startsWith("video/") && !file.type.startsWith("audio/") && <FaFile size={40} />}
            <span className="file_name_text">{file.name}</span>
            <button type="button" className="close_preview_btn" onClick={() => setFile(null)}>
              <FaXmark size={16} />
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP STYLE BOTTOM INPUT BAR */}
      <form
        className={`chat_input_form ${isChatDisabled ? "chat_input_disabled" : ""}`}
        onSubmit={(e) => { 
          e.preventDefault(); 
          if (!isChatDisabled) sendMessage(e); 
        }}
      >
        <div className="attachment_wrapper">
          <button
            type="button"
            className={`attach_btn ${showAttachmentMenu ? "active_attach" : ""}`}
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            disabled={isChatDisabled} 
          >
            <FaPaperclip size={18} />
          </button>

          {showAttachmentMenu && !isChatDisabled && (
            <div className="attachment_dropdown">
              <div className="dropdown_item" onClick={() => imageVideoRef.current.click()}>
                <BiImages size={18} /> <span>Photos & Videos</span>
              </div>
              <div className="dropdown_item" onClick={() => docRef.current.click()}>
                <FaFile size={16} /> <span>Document</span>
              </div>
              <div className="dropdown_item" onClick={() => audioRef.current.click()}>
                <BiVolumeFull size={18} /> <span>Audio</span>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Handlers */}
        <input type="file" ref={imageVideoRef} hidden onChange={handleFileChange} accept="image/*,video/*" />
        <input type="file" ref={docRef} hidden onChange={handleFileChange} accept=".pdf,.doc,.docx" />
        <input type="file" ref={audioRef} hidden onChange={handleFileChange} accept="audio/*" />

        {/* 🌟 FIXED DYNAMIC INPUT FIELD */}
        <input
          type="text"
          // Agar file select hai toh "Add a caption..." dikhega, varna "Type a message..."
          placeholder={isChatDisabled ? blockPlaceholder : (file ? "Add a caption..." : "Type a message...")} 
          // File select hone par bhi message variable ko value dikhane do (pehle 'file ? "" : message' tha jisse typing freeze thi)
          value={isChatDisabled ? "" : message} 
          onChange={(e) => setMessage(e.target.value)}
          // 🌟 PURE BUG FIX: input field se '|| !!file' hata diya taaki file hone par input disabled na ho!
          disabled={isChatDisabled} 
          className={isChatDisabled ? "disabled_input_field" : ""}
        />

        <button
          type="submit"
          className="send_msg_btn"
          disabled={isChatDisabled || (!message.trim() && !file)}
        >
          ✈️
        </button>
      </form>
    </div>
  );
}