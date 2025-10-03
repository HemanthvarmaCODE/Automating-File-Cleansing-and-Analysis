const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FileUpload = require('../models/FileUpload');
const multer = require('multer');

const upload = multer({ dest: process.env.UPLOAD_DIR });

// POST /api/files/upload
router.post('/upload', [auth, upload.array('files')], async (req, res) => {
    try {
        const uploadedFiles = req.files.map(file => ({
            userId: req.user.id,
            originalFileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            filePath: file.path,
            status: 'uploaded',
        }));

        const insertedFiles = await FileUpload.insertMany(uploadedFiles);
        res.json({ uploadedFiles: insertedFiles });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// GET /api/files
router.get('/', auth, async (req, res) => {
  try {
    const files = await FileUpload.find({ userId: req.user.id });
    res.json(files);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;