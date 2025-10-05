const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { spawn } = require('child_process');
const path = require('path');
const FileUpload = require('../models/FileUpload');
const AnalysisResult = require('../models/AnalysisResult');

router.post('/:fileId', auth, async (req, res) => {
    try {
        const file = await FileUpload.findOne({ _id: req.params.fileId, userId: req.user.id });
        if (!file) {
            return res.status(404).json({ msg: 'File not found' });
        }

        file.status = 'processing';
        await file.save();

        const scriptPath = path.resolve(__dirname, '..', 'python_model', 'process.py');
        
        // FIX: Use the absolute path to Python from the .env file
        const pythonExecutable = process.env.PYTHON_PATH || 'python'; // Fallback to 'python' if not set

        const pythonProcess = spawn(pythonExecutable, [
            scriptPath,
            path.resolve(file.filePath)
        ]);

        let outputData = '';
        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        let errorData = '';
        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        pythonProcess.on('error', (err) => {
            console.error(`Failed to start subprocess for fileId ${file._id}:`, err);
            file.status = 'error';
            file.errorMessage = 'Failed to start the analysis script. Please check server configuration.';
            file.save();
            if (!res.headersSent) {
                res.status(500).send('Failed to start analysis process.');
            }
        });

        pythonProcess.on('close', async (code) => {
            if (res.headersSent) return;

            if (code === 0) {
                try {
                    const result = JSON.parse(outputData);
                    const analysisResult = new AnalysisResult({
                        fileId: file._id,
                        userId: req.user.id,
                        piiDetected: result.piiDetected || {},
                        keyFindings: result.keyFindings || [],
                        cleansedFilePath: result.cleansedFilePath,
                        processingTime: new Date() - new Date(file.uploadedAt),
                    });
                    await analysisResult.save();
                    
                    file.status = 'completed';
                    file.processedAt = new Date();
                    await file.save();
                    
                    res.status(200).json(analysisResult);
                } catch (parseError) {
                    console.error(`JSON Parse Error for fileId ${file._id}:`, parseError, "Raw output:", outputData);
                    file.status = 'error';
                    file.errorMessage = "Failed to parse analysis result.";
                    await file.save();
                    res.status(500).send('Error parsing analysis result');
                }
            } else {
                console.error(`Python script error for fileId ${file._id}:`, errorData);
                file.status = 'error';
                file.errorMessage = errorData;
                await file.save();
                res.status(500).send('Error processing file');
            }
        });

    } catch (err) {
        console.error("Error in process route:", err.message);
        if (!res.headersSent) {
            res.status(500).send('Server Error');
        }
    }
});

module.exports = router;