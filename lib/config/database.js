"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const connectDB = async () => {
    try {
        let mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        // Try Atlas first, fallback to local
        if (mongoUri.includes('mongodb+srv')) {
            try {
                await mongoose_1.default.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
                logger_1.logger.info('MongoDB Atlas connected successfully');
                return;
            }
            catch (atlasError) {
                logger_1.logger.warn('Atlas connection failed, trying local MongoDB...');
                mongoUri = 'mongodb://localhost:27017/velin';
            }
        }
        await mongoose_1.default.connect(mongoUri);
        logger_1.logger.info('MongoDB connected successfully');
    }
    catch (error) {
        logger_1.logger.error('MongoDB connection error:', error);
        throw error;
    }
};
exports.connectDB = connectDB;
mongoose_1.default.connection.on('disconnected', () => {
    logger_1.logger.warn('MongoDB disconnected');
});
mongoose_1.default.connection.on('error', (error) => {
    logger_1.logger.error('MongoDB error:', error);
});
