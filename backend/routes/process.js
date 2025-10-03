const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { spawn } = require('child_process');
const path = require('path');
const FileUpload = require('../models/FileUpload');
const AnalysisResult = require('../models/AnalysisResult');

// POST /api/process/:fileId
router.post('/:fileId', auth, async (req, res) => {
    try {
        const file = await FileUpload.findById(req.params.fileId);
        if (!file) {
            return res.status(404).json({ msg: 'File not found' });
        }

        const pythonProcess = spawn('python3', [
            path.join(__dirname, '../python_model/process.py'),
            file.filePath
        ]);

        let outputData = '';
        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code === 0) {
                const result = JSON.parse(outputData);
                const analysisResult = new AnalysisResult({
                    fileId: file._id,
                    userId: req.user.id,
                    ...result
                });
                await analysisResult.save();
                file.status = 'completed';
                await file.save();
                res.json(analysisResult);
            } else {
                file.status = 'error';
                await file.save();
                res.status(500).send('Error processing file');
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;