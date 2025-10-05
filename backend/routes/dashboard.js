const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FileUpload = require('../models/FileUpload');
const AnalysisResult = require('../models/AnalysisResult');

router.get('/stats', auth, async (req, res) => {
    try {
        const totalFilesProcessed = await FileUpload.countDocuments({ userId: req.user.id, status: 'completed' });

        const results = await AnalysisResult.find({ userId: req.user.id });
        const totalPIIRedacted = results.reduce((acc, result) => {
            return acc + Object.values(result.piiDetected).reduce((sum, count) => sum + count, 0);
        }, 0);
        
        const avgProcessingTimeResult = await AnalysisResult.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(req.user.id) } },
            { $group: { _id: null, avgTime: { $avg: '$processingTime' } } }
        ]);
        const avgProcessingTime = avgProcessingTimeResult.length > 0 ? avgProcessingTimeResult[0].avgTime : 0;

        const recentFiles = await FileUpload.find({ userId: req.user.id })
            .sort({ uploadedAt: -1 })
            .limit(5);

        res.json({
            totalFilesProcessed,
            totalPIIRedacted,
            avgProcessingTime,
            recentFiles
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;