const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AnalysisResult = require('../models/AnalysisResult');
const AnalysisSession = require('../models/AnalysisSession'); // FIX: Import the AnalysisSession model
const path = require('path');
const fs = require('fs');

// GET results for the latest session
router.get('/latest', auth, async (req, res) => {
    try {
        const latestSession = await AnalysisSession.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
        if (!latestSession) {
            return res.json([]);
        }
        const results = await AnalysisResult.find({ sessionId: latestSession._id });
        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET download cleansed file by result ID
router.get('/:resultId/download', auth, async (req, res) => {
    try {
        const result = await AnalysisResult.findById(req.params.resultId);
        if (!result) {
            return res.status(404).send('Analysis result not found.');
        }

        const session = await AnalysisSession.findById(result.sessionId);
        if (!session || session.userId.toString() !== req.user.id) {
            return res.status(401).send('Unauthorized');
        }
        
        const filePath = path.resolve(result.cleansedFilePath);
        if (fs.existsSync(filePath)) {
            res.download(filePath, `cleansed_${result.originalFileName}`);
        } else {
            res.status(404).send('Cleansed file not found on server.');
        }
    } catch (err) {
        console.error("Download Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;