const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FileUpload = require('../models/FileUpload');
const AnalysisResult = require('../models/AnalysisResult');
const User = require('../models/User');
const mongoose = require('mongoose');

router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('storageUsed storageLimit');

        const totalFilesProcessed = await FileUpload.countDocuments({ userId, status: 'completed' });
        const queueCount = await FileUpload.countDocuments({ userId, status: { $in: ['queued', 'processing'] } });
        
        const results = await AnalysisResult.find({ userId });

        const totalPIIRedacted = results.reduce((acc, result) => {
            if (result.piiDetected && typeof result.piiDetected === 'object') {
                return acc + Object.values(result.piiDetected).reduce((sum, count) => sum + (count || 0), 0);
            }
            return acc;
        }, 0);
        
        // Define a "critical finding" as any result with more than 10 PII instances
        const criticalFindings = results.filter(result => {
             if (result.piiDetected && typeof result.piiDetected === 'object') {
                const piiCount = Object.values(result.piiDetected).reduce((sum, count) => sum + (count || 0), 0);
                return piiCount > 10;
            }
            return false;
        }).length;

        const avgProcessingTimeResult = await AnalysisResult.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, avgTime: { $avg: '$processingTime' } } }
        ]);
        const avgProcessingTime = avgProcessingTimeResult.length > 0 ? avgProcessingTimeResult[0].avgTime : 0;

        const recentFiles = await FileUpload.find({ userId })
            .sort({ uploadedAt: -1 })
            .limit(5);

        res.json({
            totalFilesProcessed,
            totalPIIRedacted,
            criticalFindings, // New data
            avgProcessingTime,
            recentFiles,
            storageUsed: user.storageUsed, // New data
            storageLimit: user.storageLimit, // New data
            queueCount // New data
        });

    } catch (err) {
        console.error("Error fetching dashboard stats:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;