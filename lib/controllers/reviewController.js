"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.updateReview = exports.getHostelReviews = exports.createReview = void 0;
const Review_1 = require("../models/Review");
const Hostel_1 = require("../models/Hostel");
const Booking_1 = require("../models/Booking");
const cloudinaryService_1 = require("../services/cloudinaryService");
const logger_1 = require("../utils/logger");
const createReview = async (req, res) => {
    try {
        const { hostelId, rating, text } = req.body;
        // Check if user has booked this hostel
        const booking = await Booking_1.Booking.findOne({
            userId: req.user._id,
            hostelId,
            paymentStatus: 'paid'
        });
        if (!booking) {
            return res.status(403).json({ error: 'You can only review hostels you have booked' });
        }
        // Check if user already reviewed this hostel
        const existingReview = await Review_1.Review.findOne({
            userId: req.user._id,
            hostelId
        });
        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this hostel' });
        }
        // Handle image uploads
        let imageUrls = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const result = await (0, cloudinaryService_1.uploadToCloudinary)(file);
                imageUrls.push(result.url);
            }
        }
        const review = new Review_1.Review({
            userId: req.user._id,
            hostelId,
            rating,
            text,
            images: imageUrls
        });
        await review.save();
        // Update hostel rating
        await updateHostelRating(hostelId);
        res.status(201).json({
            message: 'Review created successfully',
            review
        });
    }
    catch (error) {
        logger_1.logger.error('Create review error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createReview = createReview;
const getHostelReviews = async (req, res) => {
    try {
        const { hostelId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const reviews = await Review_1.Review.find({ hostelId, flagged: false })
            .populate('userId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        const total = await Review_1.Review.countDocuments({ hostelId, flagged: false });
        res.json({
            reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get hostel reviews error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getHostelReviews = getHostelReviews;
const updateReview = async (req, res) => {
    try {
        const review = await Review_1.Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        if (review.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { rating, text } = req.body;
        review.rating = rating || review.rating;
        review.text = text || review.text;
        await review.save();
        // Update hostel rating
        await updateHostelRating(review.hostelId);
        res.json({
            message: 'Review updated successfully',
            review
        });
    }
    catch (error) {
        logger_1.logger.error('Update review error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateReview = updateReview;
const deleteReview = async (req, res) => {
    try {
        const review = await Review_1.Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await Review_1.Review.findByIdAndDelete(req.params.id);
        // Update hostel rating
        await updateHostelRating(review.hostelId);
        res.json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Delete review error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteReview = deleteReview;
const updateHostelRating = async (hostelId) => {
    try {
        const reviews = await Review_1.Review.find({ hostelId, flagged: false });
        if (reviews.length === 0) {
            await Hostel_1.Hostel.findByIdAndUpdate(hostelId, {
                rating: 0,
                reviewCount: 0
            });
            return;
        }
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        await Hostel_1.Hostel.findByIdAndUpdate(hostelId, {
            rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            reviewCount: reviews.length
        });
    }
    catch (error) {
        logger_1.logger.error('Update hostel rating error:', error);
    }
};
