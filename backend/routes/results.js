const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AnalysisResult = require('../models/AnalysisResult');

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

module.exports = router;