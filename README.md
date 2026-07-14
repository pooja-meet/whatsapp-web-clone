# 💬 LiveChat13 - Real-Time Chat Application

LiveChat13 is a production-ready, full-stack real-time communication platform built using the MERN stack. It features instant messaging, comprehensive user privacy controls, secure authentication, and a dynamic media sharing system.

## 🚀 Live Demo & Repository
* **Live Demo:** [Click Here to View Live](https://livechat13.netlify.app/login)

---

## ✨ Key Features

* **Real-Time Communication:** Zero-latency peer-to-peer messaging using **Socket.io** with live presence tracking (Online/Offline status).
* **Message Status Workflows:** Visual status indicators for every message sent: **Sent, Delivered, and Seen (Ticks)**.
* **Granular Privacy Controls:** 
  * Users can **Block/Unblock** specific contacts.
  * Option to **Clear Chat History** from any individual conversation.
  * Secure **Account Deactivation** workflows.
* **Robust Authentication:** Secure registration and login flow utilizing **JSON Web Tokens (JWT)** and **Bcrypt** hashing, reinforced with custom Socket.io middleware for secure connections.
* **Media Sharing:** Real-time multi-media uploads managed via **Multer** and securely stored/served through **Cloudinary**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js, Custom CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Mongoose ORM |
| **Real-Time Engine**| Socket.io |
| **File Storage** | Multer, Cloudinary API |
| **Security** | JWT (JSON Web Tokens), Bcrypt |
git clone [https://github.com/your-username/LiveChat13.git](https://github.com/your-username/LiveChat13.git)
cd LiveChat13
