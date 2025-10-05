const mongoose = require('mongoose');

const analysisSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileUpload',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
});

module.exports = mongoose.model('AnalysisSession', analysisSessionSchema);