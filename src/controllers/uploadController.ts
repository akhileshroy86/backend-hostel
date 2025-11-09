import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import { AuthRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { logger } from '../utils/logger';

// Configure multer for temporary file storage
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const uploadImage = upload.single('image');

export const handleImageUpload = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file);
    
    logger.info('Image uploaded to Cloudinary:', cloudinaryResult.url);
    
    res.json({
      message: 'Image uploaded successfully',
      url: cloudinaryResult.url,
      public_id: cloudinaryResult.public_id,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height
    });
  } catch (error) {
    logger.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};