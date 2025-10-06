const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { spawn } = require('child_process');
const path = require('path');
const AnalysisSession = require('../models/AnalysisSession');
const AnalysisResult = require('../models/AnalysisResult');

router.post('/:sessionId', auth, async (req, res) => {
    try {
        const session = await AnalysisSession.findOne({ _id: req.params.sessionId, userId: req.user.id }).populate('files');
        if (!session) {
            return res.status(404).json({ msg: 'Analysis session not found.' });
        }

        session.status = 'processing';
        await session.save();

        const scriptPath = path.resolve(__dirname, '..', 'python_model', 'process.py');
        const pythonExecutable = process.env.PYTHON_PATH || 'python';
        
        const sessionDir = path.resolve(process.env.UPLOAD_DIR, req.params.sessionId);
        if (!require('fs').existsSync(sessionDir)) require('fs').mkdirSync(sessionDir);

        for (const file of session.files) {
            const destPath = path.join(sessionDir, file.originalFileName);
            require('fs').copyFileSync(file.filePath, destPath);
        }

        const pythonProcess = spawn(pythonExecutable, [scriptPath, sessionDir]);

        let outputData = '', errorData = '';
        pythonProcess.stdout.on('data', (data) => outputData += data.toString());
        pythonProcess.stderr.on('data', (data) => errorData += data.toString());
        
        pythonProcess.on('close', async (code) => {
            if (code === 0) {
                const results = JSON.parse(outputData);
                for (const result of results) {
                    await AnalysisResult.create({
                        sessionId: session._id,
                        ...result
                    });
                }
                session.status = 'completed';
            } else {
                console.error(`Python script error for session ${session._id}:`, errorData);
                session.status = 'failed';
            }
            session.completedAt = new Date();
            await session.save();
            res.status(200).json({ message: 'Processing complete', status: session.status });
        });

    } catch (err) {
        console.error("Error in process route:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;