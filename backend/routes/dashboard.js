const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FileUpload = require('../models/FileUpload');
const AnalysisResult = require('../models/AnalysisResult');
const mongoose = require('mongoose');

router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from token

        const totalFilesProcessed = await FileUpload.countDocuments({ userId: userId, status: 'completed' });

        const results = await AnalysisResult.find({ userId: userId });

        const totalPIIRedacted = results.reduce((acc, result) => {
            if (result.piiDetected && typeof result.piiDetected === 'object') {
                return acc + Object.values(result.piiDetected).reduce((sum, count) => sum + (count || 0), 0);
            }
            return acc;
        }, 0);
        
        const avgProcessingTimeResult = await AnalysisResult.aggregate([
             // FIX: Do not use 'new' or convert the id, mongoose handles it
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, avgTime: { $avg: '$processingTime' } } }
        ]);
        const avgProcessingTime = avgProcessingTimeResult.length > 0 ? avgProcessingTimeResult[0].avgTime : 0;

        const recentFiles = await FileUpload.find({ userId: userId })
            .sort({ uploadedAt: -1 })
            .limit(5);

        res.json({
            totalFilesProcessed,
            totalPIIRedacted,
            avgProcessingTime,
            recentFiles
        });

    } catch (err) {
        console.error("Error fetching dashboard stats:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;