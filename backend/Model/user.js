const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, required: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    image: {
        url: {
            type: String,
            default: null
        },
        public_url: {
            type: String,
            default: null
        }
    },
    about: {
        type: String,
        default: "Hey there! I am using WhatsApp.",
        maxLength: 150
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    // Relationship management
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    isDeactivated: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })
module.exports = mongoose.model('User', userSchema)