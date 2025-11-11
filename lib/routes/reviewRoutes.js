"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../middlewares/auth");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ dest: 'uploads/' });
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, upload.array('images', 5), reviewController_1.createReview);
router.get('/hostel/:hostelId', reviewController_1.getHostelReviews);
router.put('/:id', auth_1.authenticate, reviewController_1.updateReview);
router.delete('/:id', auth_1.authenticate, reviewController_1.deleteReview);
exports.default = router;
