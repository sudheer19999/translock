const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { nodewhisper } = require('nodejs-whisper'); // Assuming this is the transcription library you're using
const cors = require('cors');

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

const uploadsDir = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer configuration for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// Function to remove timestamps from the transcription text
function cleanTranscriptionText(transcription) {
    // Regular expression to remove timestamps like [00:00:00.000 --> 00:00:02.000]
    return transcription.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/g, '').trim();
}

// Route to handle audio file upload and transcription
app.post('/transcribe', upload.single('audio'), (req, res) => {
    const webmFilePath = req.file.path;
    const wavFilePath = path.join(uploadsDir, `${path.parse(req.file.filename).name}.wav`);

    console.log(`Processing WebM file: ${webmFilePath}`);
    console.log(`Target WAV file: ${wavFilePath}`);

    // Convert WebM to WAV using ffmpeg
    exec(`ffmpeg -i ${webmFilePath} -vn -ar 16000 -ac 1 -b:a 128k ${wavFilePath}`, (err) => {
        if (err) {
            console.error(`Error converting WebM to WAV: ${err.message}`);
            return res.status(500).send('Error processing audio file.');
        }

        console.log('Conversion complete.');
        console.log('WAV file exists, starting transcription...');

        // Delete WebM file after conversion
        deleteFile(webmFilePath);

        // Use nodewhisper for transcription
        nodewhisper(wavFilePath, {
            modelName: 'base.en',
            autoDownloadModelName: 'base.en',
            whisperOptions: { outputInText: true }
        })
        .then((transcription) => {
            console.log('Transcription complete:', transcription);

            // Clean the transcription text by removing timestamps
            const cleanedTranscription = cleanTranscriptionText(transcription);

            // Return the cleaned transcription result to the client
            res.json({ transcription: cleanedTranscription });

            // Clean up after transcription
            deleteFile(wavFilePath);
        })
        .catch((transcriptionError) => {
            console.error(`Error during transcription: ${transcriptionError.message}`);
            res.status(500).send('Error during transcription.');
        });
    });
});

// Delete files safely
function deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file: ${filePath}`, err);
            } else {
                console.log(`Deleted file: ${filePath}`);
            }
        });
    } else {
        console.log(`File not found, no need to delete: ${filePath}`);
    }
}

// Function to clean up if there are too many files (optional)
function cleanupIfTooManyFiles() {
    const files = fs.readdirSync(uploadsDir);
    if (files.length > 10) {
        console.log('Too many files in uploads folder, cleaning up...');
        files.forEach((file) => {
            const filePath = path.join(uploadsDir, file);
            deleteFile(filePath);
        });
    }
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
