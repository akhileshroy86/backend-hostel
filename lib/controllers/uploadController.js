"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleImageUpload = exports.uploadImage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const cloudinaryService_1 = require("../services/cloudinaryService");
const logger_1 = require("../utils/logger");
// Configure multer for temporary file storage
const upload = (0, multer_1.default)({
    dest: 'temp/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
exports.uploadImage = upload.single('image');
const handleImageUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Upload to Cloudinary
        const cloudinaryResult = await (0, cloudinaryService_1.uploadToCloudinary)(req.file);
        logger_1.logger.info('Image uploaded to Cloudinary:', cloudinaryResult.url);
        res.json({
            message: 'Image uploaded successfully',
            url: cloudinaryResult.url,
            public_id: cloudinaryResult.public_id,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height
        });
    }
    catch (error) {
        logger_1.logger.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
};
exports.handleImageUpload = handleImageUpload;
