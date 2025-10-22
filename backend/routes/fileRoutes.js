import express from 'express';
import { upload, uploadFile, getFileInfo, deleteFile } from '../controllers/fileController.js';

const router = express.Router();

// File upload endpoint
router.post('/upload', upload.single('file'), uploadFile);

// Get file info
router.get('/info/:filename', getFileInfo);

// Delete file
router.delete('/:filename', deleteFile);

export default router;