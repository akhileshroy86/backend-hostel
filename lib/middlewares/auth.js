"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const authenticate = async (req, res, next) => {
    try {
        console.log('=== AUTH DEBUG ===');
        console.log('Authorization header:', req.header('Authorization'));
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('Extracted token:', token ? 'Present' : 'Missing');
        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        console.log('JWT_SECRET available:', process.env.JWT_SECRET ? 'Yes' : 'No');
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded:', decoded);
        const user = await User_1.User.findById(decoded.userId);
        console.log('User found:', user ? user.email : 'Not found');
        if (!user) {
            console.log('User not found in database');
            return res.status(401).json({ error: 'Invalid token.' });
        }
        req.user = user;
        console.log('Authentication successful for:', user.email);
        next();
    }
    catch (error) {
        console.error('Authentication error:', error.message);
        res.status(401).json({ error: 'Invalid token.', details: error.message });
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};
exports.authorize = authorize;
