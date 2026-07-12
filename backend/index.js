const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

const auth = require('./Routes/authRoutes');
const chat = require('./Routes/messageRoutes');
const User = require('./Model/user');

// Middlewares
const allowedOrigins = [
  "http://localhost:5173",          // Local development ke liye
  "https://livechat13.netlify.app"   // Aapki live Netlify site
];
// 1. Express CORS Setup
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "PUT", "POST", "DELETE"],
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);

// REST API Routes
app.use('/api/auth', auth);
app.use('/api/chat', chat);

app.get('/', (req, res) => {
  res.status(200).json({ message: "server is running" });
});

// =========================================================================
// SOCKET.IO CONFIGURATION
// =========================================================================
const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const activeUsers = {}; // Memory Storage: { userId: socketId }

io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  // -------------------------------------------------------------------------
  // 1. SETUP EVENT (Jab user online aaye)
  // -------------------------------------------------------------------------
  socket.on("setup", async (userId) => {
    if (!userId) return;

    socket.userId = userId;
    activeUsers[userId] = socket.id;

    socket.join(userId); // User ID ka personal private room banaya
    console.log(`User joined room: ${userId}`);

    try {
      // Database update aur baaki users ko real-time status alert
      await User.findByIdAndUpdate(userId, { isOnline: true });
      socket.broadcast.emit("user_status_change", { userId, isOnline: true });
    } catch (err) {
      console.error("Socket Online Status Update Error:", err.message);
    }

    socket.emit("connected");
  });

  // -------------------------------------------------------------------------
  // 2. NEW MESSAGE EVENT (Step 1 & Step 2 Ticks Handled Here)
  // -------------------------------------------------------------------------
  socket.on("new message", (newMessageReceived) => {
    const chatRoom = newMessageReceived.chat;

    if (!chatRoom || !chatRoom.users) {
      return console.log("Chat room structure or users array not defined");
    }

    const senderId = newMessageReceived.sender._id || newMessageReceived.sender;

    chatRoom.users.forEach((user) => {
      const currentUserId = user._id || user;

      // Khud ko dubara signal nahi bhejenge
      if (currentUserId === senderId) return;

      // Saamne wale user ko message deliver kiya
      io.to(currentUserId).emit("message received", newMessageReceived);

      // 🔥 STEP 2 (Double Grey Tick): Agar saamne wala online hai, toh sender ko trigger do
      if (activeUsers[currentUserId]) {
        io.to(senderId).emit("message_delivered", {
          messageId: newMessageReceived._id,
          chatId: chatRoom._id || chatRoom,
          receiverId: currentUserId
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. MESSAGE READ EVENT (Step 3: Blue Tick Sync)
  // -------------------------------------------------------------------------
  socket.on("message_read", async (data) => {
    const { chatId, senderId } = data; // senderId = Jiska message read kiya gaya hai

    if (!chatId || !senderId) return;

    const readerId = socket.userId; // Jisne abhi chat open ki

    // Original sender ke paas order bhej diya ki blue tick render kare
    io.to(senderId).emit("messages_marked_read", {
      chatId,
      senderId: readerId
    });
  });

  // -------------------------------------------------------------------------
  // 4. REAL-TIME PEER BLOCK STATUS SYNC EVENT
  // -------------------------------------------------------------------------
  socket.on("peer_block_event", (data) => {
    const { updaterId, targetId, updatedBlockedUsers } = data;

    if (!updaterId || !targetId) return;

    // Target user ko batayein ki block/unblock list change hui hai
    io.to(targetId).emit("block_status_synced", {
      updaterId,
      updatedBlockedUsers
    });

    console.log(`📡 Block Status Synced: User ${updaterId} pushed updates to User ${targetId}`);
  });

  // -------------------------------------------------------------------------
  // 5. DISCONNECT EVENT (Crucial for Single Tick & Last Seen)
  // -------------------------------------------------------------------------
  socket.on("disconnect", async () => {
    console.log("🔴 A user disconnected:", socket.id);

    const userId = socket.userId;
    if (userId) {
      // Online active memory dictionary se clean karo
      delete activeUsers[userId];

      try {
        // Database offline karo aur last seen time stamp update karo
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit("user_status_change", { userId, isOnline: false, lastSeen: new Date() });
      } catch (err) {
        console.error("Socket Offline Status Update Error:", err.message);
      }
    }
  });
});

// =========================================================================
// DATABASE CONNECTION & SERVER INITIALIZATION
// =========================================================================
const connectDb = require('./Utils/db');
const PORT = process.env.PORT || 5000;

connectDb().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port : http://localhost:${PORT}`);
  });
});
