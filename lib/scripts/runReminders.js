"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("../config/database");
const reminderService_1 = require("../services/reminderService");
dotenv_1.default.config();
const runScript = async () => {
    try {
        await (0, database_1.connectDB)();
        console.log('Connected to database');
        await (0, reminderService_1.runReminderService)();
        console.log('Reminder service completed');
        process.exit(0);
    }
    catch (error) {
        console.error('Script error:', error);
        process.exit(1);
    }
};
runScript();
