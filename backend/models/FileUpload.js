const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['csv', 'pdf', 'pptx', 'xlsx', 'jpg', 'jpeg', 'png'],
    required: true
  },
  fileSize: Number,
  filePath: String, // Original file location
  status: {
    type: String,
    enum: ['uploading', 'queued', 'processing', 'completed', 'error'],
    default: 'uploading'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  errorMessage: String
});

module.exports = mongoose.model('FileUpload', fileUploadSchema);