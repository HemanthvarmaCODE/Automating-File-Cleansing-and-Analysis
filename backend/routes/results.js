const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AnalysisResult = require('../models/AnalysisResult');

// GET /api/results/:fileId
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