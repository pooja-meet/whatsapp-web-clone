const express = require('express');
const router = express.Router();
const Message = require('../Model/message');
const Chat = require('../Model/chat');
const User = require('../Model/user');
const verifyToken = require('../Controller/authController');
const upload = require('../Utils/cloudinary');
// ===================================
// 1. GET: Apni profile dekhne ke liye  
// ===================================
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const loggedInUser = req.user.id;

        if (!loggedInUser) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const user = await User.findById(loggedInUser).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Profile fetched successfully", user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// ===================================
// 2. GET: Saare App Users fetch karna (Contacts Modal ke liye)
// ===================================
router.get('/all-users', verifyToken, async (req, res) => {
    try {
        const loggedInUser = req.user.id;

        if (!loggedInUser) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const currentUserData = await User.findById(loggedInUser).select('blockedUsers');
        const myBlockedList = currentUserData?.blockedUsers || [];

        const contacts = await User.find({
            _id: {
                $ne: loggedInUser,
                $nin: myBlockedList
            },
            blockedUsers: { $nin: [loggedInUser] },
            isDeactivated: { $ne: true }
        }).select("name email image about isOnline lastSeen");

        res.status(200).json(contacts);
    } catch (error) {
        console.error("Fetch All Contacts Error:", error.message);
        res.status(500).json({ message: "Failed to load contacts list" });
    }
});

// =========================================================================
// 3. GET: Sidebar ke saare users load karna (🛡️ Clear Chat & Soft Delete Supported)
// =========================================================================
router.get('/users', verifyToken, async (req, res) => {
    try {
        const loggedInUser = req.user.id;

        if (!loggedInUser) {
            return res.status(400).json({ message: "User not authenticated correctly" });
        }

        const currentUserData = await User.findById(loggedInUser).select('blockedUsers');
        const myBlockedList = currentUserData?.blockedUsers || [];

        let chats = await Chat.find({
            users: { $elemMatch: { $eq: loggedInUser } }
        })
            .populate("users", "name email image about isOnline lastSeen blockedUsers isDeactivated")
            .populate({
                path: "latestMessage",
                select: "content createdAt sender messageType"
            })
            .sort({ updatedAt: -1 });

        const formattedUsers = chats.map(chat => {
            const otherUser = chat.users.find(u => u && u._id.toString() !== loggedInUser.toString());

            if (!otherUser) return null;

            if (myBlockedList.includes(otherUser._id.toString())) return null;

            // 🔥 PROFESSIONAL LOGIC: Agar user ne chat clear ki thi aur uske baad koi naya message nahi aaya, 
            // toh use sidebar list se temporary hide kar do (WhatsApp behavior)
            if (chat.clearedAt && chat.clearedAt.get(loggedInUser.toString())) {
                const clearTime = chat.clearedAt.get(loggedInUser.toString());

                // Agar koi latest message nahi hai, ya fir latest message clear karne ke samay se pehle ka hai
                if (!chat.latestMessage || new Date(chat.latestMessage.createdAt) <= new Date(clearTime)) {
                    return null;
                }
            }

            // Fallback for deactivated users
            if (otherUser.isDeactivated) {
                return {
                    _id: otherUser._id,
                    name: "Deactivated User",
                    email: "",
                    image: { url: null, public_url: null },
                    about: "This account has been closed.",
                    isOnline: false,
                    lastSeen: otherUser.lastSeen,
                    latestMessage: chat.latestMessage
                };
            }

            return {
                _id: otherUser._id,
                name: otherUser.name,
                email: otherUser.email,
                image: otherUser.image,
                about: otherUser.about,
                isOnline: otherUser.isOnline,
                lastSeen: otherUser.lastSeen,
                latestMessage: chat.latestMessage
            };
        }).filter(user => user !== null);

        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error("Fetch Users Error:", error.message);
        res.status(500).json({ message: "Failed to load users" });
    }
});

// ===================================
// 4. POST: Message Bhejna
// ===================================
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
    const { receiverId, content } = req.body;
    const sender = req.user.id;

    // Check ki dono me se kam se kam ek cheez zaroor ho
    if (!receiverId || (!content && !req.file)) {
        return res.status(400).json({ msg: "Message or file is required" });
    }

    try {
        const senderUser = await User.findById(sender).select('blockedUsers');
        const receiverUser = await User.findById(receiverId).select('blockedUsers');

        if (!receiverUser) {
            return res.status(404).json({ msg: "Receiver user nahi mila" });
        }

        if (senderUser.blockedUsers.includes(receiverId)) {
            return res.status(403).json({ msg: "Aapne is user ko block kiya hai. Message nahi bhej sakte." });
        }

        if (receiverUser.blockedUsers.includes(sender)) {
            return res.status(403).json({ msg: "Is user ne aapko block kiya hai. Aap message nahi bhej sakte." });
        }

        // 🌟 NEW LOGIC: Dono data ko variables me alag separate karein
        let finalContent = content || ""; // Agat text message ya caption hai toh save hoga, nahi toh empty string
        let fileLink = null;              // File URL ke liye alag variable
        let finalType = "text";

        if (req.file) {
            fileLink = req.file.path; // Cloudinary secure path ab fileUrl me jayega

            if (req.file.mimetype.startsWith("image")) {
                finalType = "image";
            } else if (req.file.mimetype.startsWith("video")) {
                finalType = "video";
            } else if (req.file.mimetype.startsWith("audio")) {
                finalType = "audio";
            } else {
                finalType = "file";
            }
        }

        let chat = await Chat.findOne({
            isGroupChat: false,
            $and: [
                { users: { $elemMatch: { $eq: sender } } },
                { users: { $elemMatch: { $eq: receiverId } } }
            ]
        });

        if (!chat) {
            chat = await Chat.create({
                chatName: "",
                isGroupChat: false,
                users: [sender, receiverId]
            });
        }

        // 🌟 NEW LOGIC: Schema fields se match karke data insert karein
        const newMesssageDoc = await Message.create({
            sender,
            chat: chat._id,
            messageType: finalType,
            content: finalContent,  // Sirf Text Content / Media Caption
            fileUrl: fileLink       // Cloudinary Image/File URL
        });

        chat.latestMessage = newMesssageDoc._id;
        await chat.save();

        const populatedMessage = await Message.findById(newMesssageDoc._id)
            .populate("sender", "name email image")
            .populate({
                path: "chat",
                populate: { path: "users", select: "name email image" }
            });

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Send Message Error:", error.message);
        res.status(500).json({ message: "Failed to send message", error: error.message });
    }
});
// ====================================
// 5. GET: Chat History (🛡️ Cleared Chat Filtering Integrated)
// ====================================
router.get('/:userId', verifyToken, async (req, res) => {
    const loggedInUser = req.user.id;
    const otherUser = req.params.userId;

    try {
        const chat = await Chat.findOne({
            isGroupChat: false,
            $and: [
                { users: { $elemMatch: { $eq: loggedInUser } } },
                { users: { $elemMatch: { $eq: otherUser } } }
            ]
        });

        if (!chat) {
            return res.status(200).json([]);
        }

        // Base query setup
        let messageQuery = {
            chat: chat._id,
            // 🔥 CRITICAL FILTER: Sirf wo messages laao jo is loggedInUser ne delete NA kiye hon
            deletedFor: { $nin: [loggedInUser] }
        };

        // Purana clear chat timestamp logic
        if (chat.clearedAt && chat.clearedAt.get(loggedInUser.toString())) {
            const clearTime = chat.clearedAt.get(loggedInUser.toString());
            messageQuery.createdAt = { $gt: clearTime };
        }

        const messages = await Message.find(messageQuery)
            .populate('sender', 'name email image')
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    }
    catch (error) {
        console.error("Fetch Messages Error:", error.message);
        res.status(500).json({ message: "Failed to load messages" });
    }
});
// ====================================
// 6. PUT: Clear Chat Action Trigger 🌟 (Naya Route)
// ====================================
router.put('/clear-chat/:targetUserId', verifyToken, async (req, res) => {
    try {
        const loggedInUser = req.user.id;
        const { targetUserId } = req.params;

        const chat = await Chat.findOne({
            isGroupChat: false,
            $and: [
                { users: { $elemMatch: { $eq: loggedInUser } } },
                { users: { $elemMatch: { $eq: targetUserId } } }
            ]
        });

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat room nahi mila" });
        }

        // Map me logged-in user ke ID ke against current timestamp daal do
        chat.clearedAt.set(loggedInUser.toString(), new Date());
        await chat.save();

        res.status(200).json({ success: true, message: "Chat cleared successfully for you." });
    } catch (error) {
        console.error("Clear Chat API Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to clear chat" });
    }
});

// ====================================
// 7. PUT: Message ko read show karne ke leye
// ====================================
router.put('/seen/:chatId', verifyToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const loggedInUser = req.user.id; // Token verification lagane ke baad id mil gayi

        const updatedMessages = await Message.updateMany(
            {
                chat: chatId,
                status: { $ne: 'read' },
                sender: { $ne: loggedInUser } // Ab aap khud ke bheje hue message khud seen nahi karenge 🎯
            },
            {
                $set: { status: 'read' }
            }
        );

        res.status(200).json({
            success: true,
            message: "All messages marked as read",
            modifiedCount: updatedMessages.modifiedCount
        });
    } catch (error) {
        console.error("Error in seen route:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ====================================
// PUT: Single Message Delete For Me (Naya Route)
// ====================================
router.put('/message/delete-for-me/:messageId', verifyToken, async (req, res) => {
    try {
        const loggedInUser = req.user.id;
        const { messageId } = req.params;

        // Message dhoondo aur uske 'deletedFor' array mein meri ID push kar do ($addToSet duplicates rokta hai)
        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { $addToSet: { deletedFor: loggedInUser } },
            { new: true }
        );

        if (!updatedMessage) {
            return res.status(404).json({ success: false, message: "Message nahi mila" });
        }

        res.status(200).json({ success: true, message: "Message deleted for you successfully." });
    } catch (error) {
        console.error("Delete for me error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete message" });
    }
});

module.exports = router;