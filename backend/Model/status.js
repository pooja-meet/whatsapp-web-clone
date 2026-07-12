const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    medialUrl: {
        type: String,
        enum: ['text', 'image', 'video'],
        default: '',
        required: true
    },
    caption: {
        type: String,
        maxLength: 100,
        default: ""
    },
    // 🔥 AUTO DELETE: 24 ghante (86400 seconds) baad status automatic delete ho jayega
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400
    }
});

module.exports = mongoose.model('Status', statusSchema);