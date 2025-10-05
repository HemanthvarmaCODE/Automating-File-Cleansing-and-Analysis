const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnalysisSession',
    required: true,
  },
  originalFileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['completed', 'error'],
    required: true,
  },
  summary: {
    type: String,
    default: 'No summary available.'
  },
  piiDetected: {
    type: Map,
    of: Number,
  },
  vulnerabilities: [{
    description: String,
    severity: String, 
  }],
  cleansedFilePath: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);