"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.connectDB = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
// Minimal environment debug (avoid printing secrets)
console.log('Environment variables loaded: MONGO_URI', process.env.MONGO_URI ? 'Set' : 'Not set');
// ---- MIDDLEWARE ---- //
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'https://your-frontend.vercel.app', // change this to your deployed frontend
    ],
    credentials: true,
}));
app.use((0, compression_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // limit each IP
});
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Logging to console (safe for serverless)
app.use((0, morgan_1.default)('combined', {
    stream: { write: (msg) => console.log(msg.trim()) },
}));
// Routes
app.use('/api/v1', routes_1.default);
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// ---- DATABASE CONNECTION ---- //
// Use a module-level flag to avoid reconnecting on warm function invocations
let isConnected = false;
const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('❌ MONGO_URI is not set in environment variables');
    }
    // If mongoose is already connected, skip
    if (isConnected || mongoose_1.default.connection.readyState === 1) {
        console.log('MongoDB: already connected, skipping reconnect');
        isConnected = true;
        return;
    }
    await mongoose_1.default.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('✅ MongoDB connected');
    // Reset flag if disconnected
    mongoose_1.default.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
        isConnected = false;
    });
};
exports.connectDB = connectDB;
