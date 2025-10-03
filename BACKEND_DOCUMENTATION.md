# Backend Documentation

## Architecture Overview

This platform uses a **Node.js/Express backend** with **MongoDB** for data persistence. The Python model runs as a separate microservice that the backend communicates with.

---

## Technology Stack

- **Backend Framework**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: GridFS (for large files) or local storage
- **Authentication**: JWT-based authentication
- **Python Integration**: Subprocess execution or HTTP API calls

---

## MongoDB Schemas

### 1. User Schema
```javascript
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
```

### 2. File Upload Schema
```javascript
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
```

### 3. Analysis Result Schema
```javascript
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
```

### 4. Processing Queue Schema
```javascript
const processingQueueSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileUpload',
    required: true
  },
  priority: {
    type: Number,
    default: 0 // Higher number = higher priority
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date,
  errorLog: [String]
});

module.exports = mongoose.model('ProcessingQueue', processingQueueSchema);
```

---

## API Routes

### Authentication Routes

```javascript
// POST /api/auth/register
// Register a new user
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

// POST /api/auth/login
// Login and receive JWT token
{
  "email": "user@example.com",
  "password": "securePassword123"
}
// Response: { "token": "jwt_token_here", "user": {...} }

// GET /api/auth/me
// Get current user profile (requires auth token)
// Headers: { "Authorization": "Bearer jwt_token" }
```

### File Upload Routes

```javascript
// POST /api/files/upload
// Upload file(s) for processing
// Content-Type: multipart/form-data
// Body: FormData with files
// Headers: { "Authorization": "Bearer jwt_token" }
// Response: { "uploadedFiles": [...fileObjects] }

// GET /api/files
// Get all uploaded files for current user
// Query params: ?status=completed&page=1&limit=10
// Headers: { "Authorization": "Bearer jwt_token" }

// GET /api/files/:fileId
// Get specific file details
// Headers: { "Authorization": "Bearer jwt_token" }

// DELETE /api/files/:fileId
// Delete an uploaded file
// Headers: { "Authorization": "Bearer jwt_token" }
```

### Processing Routes

```javascript
// POST /api/process/:fileId
// Trigger processing for a specific file
// Headers: { "Authorization": "Bearer jwt_token" }
// Response: { "queueId": "...", "status": "queued" }

// GET /api/process/status/:fileId
// Check processing status
// Headers: { "Authorization": "Bearer jwt_token" }
// Response: { "status": "processing", "progress": 45 }

// POST /api/process/batch
// Process multiple files
// Body: { "fileIds": ["id1", "id2", "id3"] }
// Headers: { "Authorization": "Bearer jwt_token" }
```

### Analysis Results Routes

```javascript
// GET /api/results/:fileId
// Get analysis results for a file
// Headers: { "Authorization": "Bearer jwt_token" }
// Response: { "piiDetected": {...}, "keyFindings": [...], ... }

// GET /api/results
// Get all results for current user
// Query params: ?page=1&limit=10
// Headers: { "Authorization": "Bearer jwt_token" }

// GET /api/results/:fileId/download/cleansed
// Download cleansed file
// Headers: { "Authorization": "Bearer jwt_token" }

// GET /api/results/:fileId/download/report
// Download analysis report (JSON or PDF)
// Headers: { "Authorization": "Bearer jwt_token" }
```

### Dashboard & Analytics Routes

```javascript
// GET /api/dashboard/stats
// Get dashboard statistics
// Headers: { "Authorization": "Bearer jwt_token" }
// Response: {
//   "totalFilesProcessed": 1247,
//   "totalPIIRedacted": 8432,
//   "avgProcessingTime": 2400,
//   "recentFiles": [...]
// }

// GET /api/analytics/trends
// Get processing trends over time
// Query params: ?period=7d&metric=files_processed
// Headers: { "Authorization": "Bearer jwt_token" }
```

### Admin Routes (Admin Only)

```javascript
// GET /api/admin/users
// Get all users (admin only)
// Headers: { "Authorization": "Bearer admin_jwt_token" }

// GET /api/admin/system-health
// Get system health metrics
// Headers: { "Authorization": "Bearer admin_jwt_token" }

// DELETE /api/admin/files/:fileId
// Admin delete any file
// Headers: { "Authorization": "Bearer admin_jwt_token" }
```

---

## Python Model Integration

### Option 1: Subprocess Execution

```javascript
const { spawn } = require('child_process');
const path = require('path');

async function processFileWithPython(filePath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../python_model/process.py'),
      filePath
    ]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (err) {
          reject(new Error('Failed to parse Python output'));
        }
      } else {
        reject(new Error(errorData || 'Python process failed'));
      }
    });
  });
}
```

### Option 2: Python FastAPI Service

Create a separate Python service using FastAPI:

```python
# python_service/main.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

@app.post("/process")
async def process_file(file: UploadFile = File(...)):
    # Your existing Python processing logic here
    result = {
        "piiDetected": {...},
        "keyFindings": [...],
        "cleansedFilePath": "..."
    }
    return JSONResponse(content=result)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

Then call it from Node.js:

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function processFileWithPythonAPI(filePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  
  const response = await axios.post('http://localhost:8001/process', formData, {
    headers: formData.getHeaders()
  });
  
  return response.data;
}
```

---

## Environment Variables (.env)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/secureclean

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# File Storage
UPLOAD_DIR=./uploads
CLEANSED_DIR=./cleansed_files
MAX_FILE_SIZE=20971520 # 20MB in bytes

# Python Service (if using FastAPI option)
PYTHON_SERVICE_URL=http://localhost:8001

# Optional: Cloud Storage (AWS S3, etc.)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=secureclean-files
```

---

## Server Entry Point (server.js)

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✓ MongoDB connected'))
.catch(err => console.error('✗ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/process', require('./routes/process'));
app.use('/api/results', require('./routes/results'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
```

---

## Package.json Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.6.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "axios": "^1.5.0"
  }
}
```

---

## Quick Start

1. **Install dependencies**: `npm install`
2. **Start MongoDB**: `mongod` or use MongoDB Atlas
3. **Create .env file** with the variables above
4. **Run server**: `npm run dev`
5. **Start Python service** (if using FastAPI): `cd python_service && uvicorn main:app --reload --port 8001`
6. **Frontend calls**: Use `http://localhost:5000/api/...`

---

All backend routes are designed to work seamlessly with the React frontend you've already built!
