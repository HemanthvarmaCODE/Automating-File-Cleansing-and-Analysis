const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FileUpload = require('../models/FileUpload');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: process.env.UPLOAD_DIR });

router.post('/upload', [auth, upload.array('files')], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No files were uploaded.' });
    }
    const filesToSave = req.files.map(file => ({
      userId: req.user.id,
      originalFileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: path.extname(file.originalname).substring(1).toLowerCase(),
      status: 'queued',
    }));
    const insertedFiles = await FileUpload.insertMany(filesToSave);
    res.status(201).json({ uploadedFiles: insertedFiles });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const files = await FileUpload.find({ userId: req.user.id }).sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/:fileId/status', auth, async (req, res) => {
    try {
        // FIX: Ensure the user ID from the token is used in the query
        const file = await FileUpload.findOne({ _id: req.params.fileId, userId: req.user.id });
        if (!file) {
            return res.status(404).json({ msg: 'File not found' });
        }
        res.json({ status: file.status });
    } catch (err) {
        console.error("Error fetching file status:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;