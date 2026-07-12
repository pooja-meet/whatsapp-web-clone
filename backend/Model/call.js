const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Jisne call lagayi
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Jisko call aayi
        required: true
    },
    callType: {
        type: String,
        enum: ['audio', 'video'],
        required: true
    },
    status: {
        type: String,
        enum: ['missed', 'answered', 'rejected'],
        default: 'answered'
    }
}, { timestamps: true }); // timestamps se call ka date aur exact time mil jayega

module.exports = mongoose.model('Call', callSchema);