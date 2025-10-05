const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: String,
  role: {
    type: String,
    enum: ['admin', 'consultant', 'user'],
    default: 'user'
  },
  storageUsed: {
    type: Number,
    default: 0 // in bytes
  },
  storageLimit: {
    type: Number,
    default: 52428800 // 50 MB default limit
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);