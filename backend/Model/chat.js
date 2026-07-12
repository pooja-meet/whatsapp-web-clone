const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatName: { type: String, trim: true, default: "" },// Group ka naam (agar group hai toh)
    isGroupChat: { type: Boolean, default: false },// Diffrentiate karne ke liye
    // Yeh array batayega ki is chat room me kaun se do log hain
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Yeh track karega ki is chat ka sabse aakhri message kaun sa tha (Chat List par dikhane ke liye)
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    clearedAt: {
        type: Map,
        of: Date,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);