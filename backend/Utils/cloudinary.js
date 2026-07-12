const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder;
        let resourceType;

        // File extension nikalne ke liye (e.g., '.pdf', '.png')
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

        if (file.mimetype.startsWith("image")) {
            folder = "images";
            resourceType = "image";
        } else if (file.mimetype.startsWith("video")) {
            folder = "videos";
            resourceType = "video";
        }
        else if (file.mimetype.startsWith("audio")) {
            folder = "audio";
            resourceType = "video"; // 💡 Cloudinary audio ko 'video' resource_type ke sath hi process karta hai
        }
        else {
            folder = "files";
            resourceType = "raw";
        }

        return {
            folder: `chat/${folder}`,
            resource_type: resourceType,
            format: resourceType === 'raw' ? ext : undefined, // Raw files ke liye extension barqarar rahega
        };
    },
});

// 🛡️ FILE FILTER: Sirf trusted extensions ko hi allow karein
const fileFilter = (req, file, cb) => {
    const allowedExtensions = [
        // Images
        '.png', '.jpg', '.jpeg', '.gif', '.webp',
        // Videos
        '.mp4', '.mov', '.mkv', '.3gp',
        // Audio
        '.mp3', '.aac', '.wav', '.m4a',
        // Documents
        '.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.zip'
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
        cb(null, true); // Sahi file hai, chalne do
    } else {
        cb(new Error('Security Error: This file extension is not allowed!'), false); // Block kar do
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter, // Security Layer 1
    limits: {
        fileSize: 5 * 1024 * 1024,
    }
});

module.exports = upload;