const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { DocumentProcessingService } = require('../services/documentProcessing');
const documentProcessor = new DocumentProcessingService();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    logger.info('Created uploads directory:', uploadsDir);
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        logger.info('Storing file in:', uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const filename = `${Date.now()}-${file.originalname}`;
        logger.info('Generated filename:', filename);
        cb(null, filename);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        logger.debug('Received file:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv'];
        if (allowedTypes.includes(file.mimetype)) {
            logger.info('File type accepted:', file.mimetype);
            cb(null, true);
        } else {
            logger.error('Invalid file type:', file.mimetype);
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    }
});

// Add this route before the upload route
router.get('/test', (req, res) => {
    logger.info('Test endpoint hit');
    res.json({ 
        success: true,
        message: 'Document upload endpoint is working',
        timestamp: new Date().toISOString()
    });
});

// Handle file upload
router.post('/upload', (req, res) => {
    logger.info('Received upload request');
    
    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            logger.info('Created uploads directory:', uploadsDir);
        }
    } catch (error) {
        logger.error('Error creating uploads directory:', error);
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Unable to create uploads directory'
        });
    }

    upload.single('document')(req, res, async (err) => {
        if (err) {
            logger.error('Upload error:', err);
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    error: 'File upload error',
                    message: err.message
                });
            }
            return res.status(400).json({
                error: 'Invalid file',
                message: err.message
            });
        }

        try {
            if (!req.file) {
                logger.error('No file in request');
                return res.status(400).json({ 
                    error: 'Upload error',
                    message: 'No file uploaded' 
                });
            }

            logger.info('File upload successful:', req.file);

            // Process the document using DocumentProcessingService
            try {
                const extractedData = await documentProcessor.processDocument(req.file);
                logger.info('Document processed successfully:', extractedData);

                // Send the extracted data in the response
                res.status(200).json({
                    success: true,
                    message: 'File uploaded and processed successfully',
                    data: extractedData,
                    file: {
                        filename: req.file.filename,
                        path: req.file.path,
                        mimetype: req.file.mimetype,
                        size: req.file.size
                    }
                });
            } catch (processingError) {
                logger.error('Document processing error:', processingError);
                res.status(422).json({
                    error: 'Document processing failed',
                    message: processingError.message
                });
            }
        } catch (error) {
            logger.error('Processing error:', error);
            res.status(500).json({
                error: 'File processing failed',
                message: error.message
            });
        }
    });
});

module.exports = router; 