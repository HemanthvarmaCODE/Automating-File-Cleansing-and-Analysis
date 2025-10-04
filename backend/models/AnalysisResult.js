const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileUpload',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  piiDetected: {
    names: { type: Number, default: 0 },
    emails: { type: Number, default: 0 },
    phoneNumbers: { type: Number, default: 0 },
    addresses: { type: Number, default: 0 },
    otherPII: { type: Number, default: 0 }
  },
  
  extractedText: String,
  cleansedText: String,
  
  keyFindings: [String],
  securityInsights: [String],
  
  cleansedFilePath: String,
  redactedImagePath: String, 
  ocrTextPath: String, 
  
  processingTime: Number, 
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);