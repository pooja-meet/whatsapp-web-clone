const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../Model/user');
const upload = require('../Utils/cloudinary');
const verifyToken = require('../Controller/authController');
const cloudinary = require('cloudinary').v2;

// =========================================================================
// 1. REGISTER
// =========================================================================
router.post('/register', upload.single('image'), async (req, res) => {
    const { name, email, about, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, msg: "all fields are required" });
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, msg: "user already exists" });
        }
        const hashPassword = await bcrypt.hash(password, 10);

        const userData = {
            name,
            email,
            password: hashPassword,
        };
        if (about && about.trim() !== "") {
            userData.about = about;
        }
        if (req.file) {
            userData.image = {
                url: req.file.path,
                public_url: req.file.filename
            };
        }
        const newUser = await User.create(userData);

        res.status(201).json({
            success: true,
            msg: "register success",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                image: newUser.image,
                about: newUser.about,
                isOnline: newUser.isOnline,
                lastSeen: newUser.lastSeen
            }
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, msg: "Server Error", error: error.message });
    }
});

// =========================================================================
// 2. LOGIN
// =========================================================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, msg: "Please enter all fields" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, msg: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, msg: "Invalid credentials" });
        }

        // User ko online mark karein
        user.isOnline = true;
        await user.save();

        // FIX: Payload me 'id' use kiya hai taaki verifyToken middleware ke 'req.user.id' se match kare
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            success: true,
            msg: "Login successful! 🔓",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                about: user.about,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen
            }
        });

    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ success: false, msg: "Server Error", error: error.message });
    }
});

// =========================================================================
// 3. LOGOUT
// =========================================================================
router.post('/logout', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, msg: "User nahi mila" });
        }

        // User ka status offline karein aur lastSeen update karein
        user.isOnline = false;
        user.lastSeen = Date.now();
        await user.save();

        res.status(200).json({ success: true, msg: "Logged out successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, msg: error.message });
    }
});

// =========================================================================
// 4. UPDATE PROFILE
// =========================================================================
router.put('/update', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, about } = req.body;

        let updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (about) updateData.about = about;

        if (req.file) {
            const currentUser = await User.findById(userId);
            if (!currentUser) {
                return res.status(404).json({ success: false, msg: "User not found" });
            }

            // Cloudinary se purani image hatana (sirf tabhi jab pehle se image ho)
            if (currentUser.image && currentUser.image.public_url) {
                try {
                    await cloudinary.uploader.destroy(currentUser.image.public_url);
                } catch (cloudinaryErr) {
                    console.error("Old image deletion failed:", cloudinaryErr.msg);
                    // Image delete nahi bhi hui toh profile update crash nahi honi chahiye
                }
            }

            updateData.image = {
                url: req.file.path,
                public_url: req.file.filename
            };
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        ).select('-password').populate('blockedUsers', 'name email about image');

        res.status(200).json({
            success: true,
            msg: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Profile Update Error:", error.message);
        res.status(500).json({ success: false, msg: "Failed to update profile", error: error.message });
    }
});

// =========================================================================
// 5. POST: User ko Block ya Unblock karna (Toggle Route)
// =========================================================================
router.post('/block-toggle', verifyToken, async (req, res) => {
    const loggedInUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
        return res.status(400).json({ success: false, msg: "Target User ID is required" });
    }

    if (loggedInUserId === targetUserId) {
        return res.status(400).json({ success: false, msg: "Aap khud ko block nahi kar sakte!" });
    }

    try {
        const targetUserExists = await User.findById(targetUserId);
        if (!targetUserExists) {
            return res.status(404).json({ success: false, msg: "Jise block karna chahte hain, wo user nahi mila" });
        }

        const user = await User.findById(loggedInUserId);
        if (!user) {
            return res.status(404).json({ success: false, msg: "Logged-in User nahi mila" });
        }
        // Yahan code database me check karta hai ki kya User B(target) aur User A(jo login hai) sach me exist karte hain ya kisi ne fake ID bhej di hai.
        // Agar koi nahi milta, toh 404 Not Found ka error mil jata hai.

        const isBlocked = user.blockedUsers.includes(targetUserId);

        if (isBlocked) {
            // Unblock Logic
            user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetUserId); //rahul !==amit //true//
            await user.save();                                                                  //amit !==amit //false//     
            return res.status(200).json({
                success: true,
                msg: "User successfully unblocked!",
                blockedUsers: user.blockedUsers
            });
        } else {
            // Block Logic
            if (!user.blockedUsers.includes(targetUserId)) {
                user.blockedUsers.push(targetUserId);
                await user.save();
            }
            return res.status(200).json({
                success: true,
                msg: "User successfully blocked!",
                blockedUsers: user.blockedUsers
            });
        }

    } catch (error) {
        console.error("Block Toggle Error:", error.message);
        res.status(500).json({ success: false, msg: "Failed to block/unblock user" });
    }
});

// =========================================================================
// 🔥 6. DELETE: Professional Account Deactivation (Soft Delete Approach)
// =========================================================================
router.delete('/deactivate', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, msg: "Account not found." });
        }

        // 1. Soft Delete Flags Set karein
        user.isDeactivated = true;
        user.isOnline = false;
        user.lastSeen = Date.now();

        // 2. Data Masking (Privacy ke liye naam aur about badal dein)
        user.name = "Deactivated User";
        user.about = "This account has been closed.";

        // 3. Storage Cleanup: Cloudinary se avatar delete karein aur DB reference clean karein
        if (user.image && user.image.public_url) {
            try {
                await cloudinary.uploader.destroy(user.image.public_url);
                user.image = { url: null, public_url: null };
            } catch (cloudErr) {
                console.error("Cloudinary Cleanup Log:", cloudErr.message);
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            msg: "Your account has been deactivated successfully. All sessions closed."
        });

    } catch (error) {
        console.error("Account Deactivation System Error:", error.message);
        res.status(500).json({ success: false, msg: "Internal Server Error during account deactivation." });
    }
});
module.exports = router;