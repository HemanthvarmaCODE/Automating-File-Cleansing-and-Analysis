const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
    // In a real application, you would fetch this data from your database
    const stats = {
        totalFilesProcessed: 1247,
        totalPIIRedacted: 8432,
        avgProcessingTime: 2400,
        recentFiles: [
            { name: "employee_records.csv", status: "Completed", piiFound: 145, time: "2m ago" },
            { name: "security_audit.pdf", status: "Completed", piiFound: 67, time: "15m ago" },
        ]
    };
    res.json(stats);
});

module.exports = router;