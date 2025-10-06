const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FileUpload = require('../models/FileUpload');
const AnalysisSession = require('../models/AnalysisSession'); 
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');

const upload = multer({ dest: process.env.UPLOAD_DIR });

router.post('/upload', [auth, upload.array('files')], async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    const newSession = new AnalysisSession({ userId: req.user.id, status: 'pending' });
    const processedFiles = [];

    for (const file of req.files) {
      if (path.extname(file.originalname).toLowerCase() === '.zip') {
        const directory = await unzipper.Open.file(file.path);
        for (const entry of directory.files) {
          if (entry.type === 'File') {
            const content = await entry.buffer();
            const tempPath = path.join(process.env.UPLOAD_DIR, path.basename(entry.path));
            fs.writeFileSync(tempPath, content);

            const fileData = {
              userId: req.user.id,
              originalFileName: path.basename(entry.path),
              filePath: tempPath,
              fileSize: entry.uncompressedSize,
              fileType: path.extname(entry.path).substring(1).toLowerCase(),
              status: 'queued',
            };
            processedFiles.push(fileData);
          }
        }
      } else {
        const fileData = {
          userId: req.user.id,
          originalFileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          fileType: path.extname(file.originalname).substring(1).toLowerCase(),
          status: 'queued',
        };
        processedFiles.push(fileData);
      }
    }
    
    if (processedFiles.length > 0) {
        const insertedFiles = await FileUpload.insertMany(processedFiles);
        newSession.files = insertedFiles.map(f => f._id);
        await newSession.save();
        res.status(201).json({ sessionId: newSession._id, files: insertedFiles });
    } else {
        res.status(400).json({ msg: 'No valid files to process.' });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;