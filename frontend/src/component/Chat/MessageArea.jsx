import React, { useEffect, useState } from "react";
import { FaDownload, FaEye, FaXmark } from "react-icons/fa6";

export default function MessageArea({ messageList, myId, formatTime, getDateLabel, messagesEndRef }) {
  const [activeImageModal, setActiveImageModal] = useState(null);
  // 🎯 FIX 1: Jab pehli baar chat screen open ho (Direct Jump without scrolling)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, []); // Empty array yani sirf initial render par chalega

  // 🎯 FIX 2: Jab naya message aaye ya message list update ho
  useEffect(() => {
    if (messagesEndRef.current) {
      // smooth ki jagah "instant" use karein taaki jhatke se latest message par jump ho
      messagesEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [messageList]); // Har naye message par update hoga
  const handleDownload = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName || "download");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.open(fileUrl, "_blank");
    }
  };

  return (
    <div className="messages_box">
      {messageList.map((msg, index) => {
        // ID Checking logic safely handles objects or strings
        const senderId = msg.sender?._id || msg.sender;
        const isMyMessage = senderId === myId;

        const showDate =
          index === 0 ||
          new Date(msg.createdAt).toDateString() !==
          new Date(messageList[index - 1].createdAt).toDateString();

        return (
          <div key={msg._id || index} className="message_row_container">
            {/* 📅 Date Divider */}
            {showDate && (
              <div className="date-divider">
                <span>{getDateLabel(msg.createdAt)}</span>
              </div>
            )}

            {/* 🌟 Row alignment based on ownership */}
            <div className={`message_row ${isMyMessage ? "my_msg" : "other_msg"}`}>
              <div className={`message_content_bubble ${msg.messageType !== "text" ? "media_bubble" : ""}`}>

                {/* 📎 1. TEXT MESSAGE */}
                {msg.messageType === "text" && <p className="msg_text_only">{msg.content}</p>}

                {/* 🖼️ 2. IMAGE MESSAGE */}
                {msg.messageType === "image" && (
                  <div className="whatsapp_image_container">
                    <div className="image_wrapper_hover">
                      <img src={msg.fileUrl} alt="Media" className="chat_whatsapp_img" />
                      <div className="media_action_overlay">
                        <button type="button" onClick={() => setActiveImageModal(msg.fileUrl)} title="View">
                          <FaEye size={16} />
                        </button>
                        <button type="button" onClick={() => handleDownload(msg.fileUrl, `IMG-${msg._id}.jpg`)} title="Download">
                          <FaDownload size={14} />
                        </button>
                      </div>
                    </div>
                    {msg.content && msg.content.trim() !== "" && (
                      <p className="chat_media_caption">{msg.content}</p>
                    )}
                  </div>
                )}

                {/* 🎥 3. VIDEO MESSAGE */}
                {msg.messageType === "video" && (
                  <div className="whatsapp_video_container">
                    <video src={msg.fileUrl} className="chat_whatsapp_video" controls preload="metadata" />
                    {msg.content && msg.content.trim() !== "" && (
                      <p className="chat_media_caption">{msg.content}</p>
                    )}
                  </div>
                )}

                {/* 🎵 4. AUDIO MESSAGE */}
                {msg.messageType === "audio" && (
                  <div className="whatsapp_audio_container">
                    <audio src={msg.fileUrl} controls className="chat_whatsapp_audio" />
                    {msg.content && msg.content.trim() !== "" && (
                      <p className="chat_media_caption">{msg.content}</p>
                    )}
                  </div>
                )}

                {/* 📄 5. DOCUMENT / ATTACHMENT */}
                {msg.messageType !== "text" && msg.messageType !== "image" && msg.messageType !== "video" && msg.messageType !== "audio" && (
                  <div className="whatsapp_doc_container">
                    <div className="doc_file_card" onClick={() => window.open(msg.fileUrl, "_blank")}>
                      <div className="doc_icon_box">📄</div>
                      <div className="doc_meta_info">
                        <span className="doc_name_text">Document</span>
                        <span className="doc_sub_text">Click to open</span>
                      </div>
                      <button type="button" className="doc_dl_btn" onClick={(e) => { e.stopPropagation(); handleDownload(msg.fileUrl, `DOC-${msg._id}`); }}>
                        <FaDownload size={14} />
                      </button>
                    </div>
                    {msg.content && msg.content.trim() !== "" && (
                      <p className="chat_media_caption">{msg.content}</p>
                    )}
                  </div>
                )}

                {/* 🕒 Footer Metadata Stamp Inside Bubble */}
                <span className="msg_time_stamp_bar">
                  {formatTime(msg.createdAt)}
                  {isMyMessage && (
                    <span className={`status_tick ${msg.status || "sent"}`}>
                      {msg.status === "read" ? (
                        <span className="tick_blue"> ✓✓</span>
                      ) : msg.status === "delivered" ? (
                        <span className="tick_grey"> ✓✓</span>
                      ) : (
                        <span className="tick_grey"> ✓</span>
                      )}
                    </span>
                  )}
                </span>

              </div>
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />

      {/* Lightbox Preview Mode */}
      {activeImageModal && (
        <div className="whatsapp_lightbox_overlay" onClick={() => setActiveImageModal(null)}>
          <div className="lightbox_content_box" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox_close_btn" onClick={() => setActiveImageModal(null)}><FaXmark size={24} /></button>
            <img src={activeImageModal} alt="Preview" className="lightbox_full_image" />
            <button className="lightbox_download_btn" onClick={() => handleDownload(activeImageModal, "IMG.jpg")}><FaDownload size={16} /> Download</button>
          </div>
        </div>
      )}
    </div>
  );
}