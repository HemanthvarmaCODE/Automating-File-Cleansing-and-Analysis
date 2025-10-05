const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AnalysisResult = require('../models/AnalysisResult');
const path = require('path');
const fs = require('fs');

router.get('/', auth, async (req, res) => {
    try {
        const results = await AnalysisResult.find({ userId: req.user.id })
            .populate('fileId', 'originalFileName fileType')
            .sort({ createdAt: -1 });
        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/:fileId', auth, async (req, res) => {
    try {
        const result = await AnalysisResult.findOne({ fileId: req.params.fileId, userId: req.user.id });
        if (!result) {
            return res.status(404).json({ msg: 'Result not found' });
        }
        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// FIX: Add the missing download route
router.get('/:fileId/download', auth, async (req, res) => {
    try {
        const result = await AnalysisResult.findOne({ fileId: req.params.fileId, userId: req.user.id })
            .populate('fileId', 'originalFileName');

        if (!result || !result.cleansedFilePath) {
            return res.status(404).json({ msg: 'Cleansed file not found.' });
        }

        const filePath = path.resolve(result.cleansedFilePath);

        if (fs.existsSync(filePath)) {
            res.download(filePath, result.fileId ? `cleansed_${result.fileId.originalFileName}` : 'cleansed_file');
        } else {
            return res.status(404).json({ msg: 'File path does not exist.' });
        }
    } catch (err) {
        console.error('Download error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;