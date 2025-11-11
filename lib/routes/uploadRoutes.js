"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uploadController_1 = require("../controllers/uploadController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/upload', auth_1.authenticate, uploadController_1.uploadImage, uploadController_1.handleImageUpload);
exports.default = router;
