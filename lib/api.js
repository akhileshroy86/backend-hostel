"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const app_1 = require("./app");
let isConnected = false; // Prevents reconnecting on each function call
async function handler(req, res) {
    try {
        if (!isConnected) {
            await (0, app_1.connectDB)();
            isConnected = true;
            console.log('✅ MongoDB connected (serverless)');
        }
        // Let Express handle the request
        return (0, app_1.app)(req, res);
    }
    catch (err) {
        console.error('🔥 Serverless function error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
