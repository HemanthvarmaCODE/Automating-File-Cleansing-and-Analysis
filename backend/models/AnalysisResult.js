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
  
  // PII Detection Results
  piiDetected: {
    names: { type: Number, default: 0 },
    emails: { type: Number, default: 0 },
    phoneNumbers: { type: Number, default: 0 },
    addresses: { type: Number, default: 0 },
    otherPII: { type: Number, default: 0 }
  },
  
  // Extracted Content
  extractedText: String,
  cleansedText: String,
  
  // File Analysis
  keyFindings: [String],
  securityInsights: [String],
  
  // Output Files
  cleansedFilePath: String,
  redactedImagePath: String, // For images
  ocrTextPath: String, // For images with OCR
  
  // Metadata
  processingTime: Number, // in milliseconds
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);