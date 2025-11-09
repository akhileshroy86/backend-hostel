import { Response } from 'express';
import { Review } from '../models/Review';
import { Hostel } from '../models/Hostel';
import { Booking } from '../models/Booking';
import { AuthRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { logger } from '../utils/logger';

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, rating, text } = req.body;
    
    // Check if user has booked this hostel
    const booking = await Booking.findOne({
      userId: req.user._id,
      hostelId,
      paymentStatus: 'paid'
    });

    if (!booking) {
      return res.status(403).json({ error: 'You can only review hostels you have booked' });
    }

    // Check if user already reviewed this hostel
    const existingReview = await Review.findOne({
      userId: req.user._id,
      hostelId
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this hostel' });
    }

    // Handle image uploads
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file);
        imageUrls.push(result.url);
      }
    }

    const review = new Review({
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
  } catch (error) {
    logger.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHostelReviews = async (req: any, res: Response) => {
  try {
    const { hostelId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ hostelId, flagged: false })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ hostelId, flagged: false });

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get hostel reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const review = await Review.findById(req.params.id);
    
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
  } catch (error) {
    logger.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Review.findByIdAndDelete(req.params.id);

    // Update hostel rating
    await updateHostelRating(review.hostelId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    logger.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateHostelRating = async (hostelId: any) => {
  try {
    const reviews = await Review.find({ hostelId, flagged: false });
    
    if (reviews.length === 0) {
      await Hostel.findByIdAndUpdate(hostelId, {
        rating: 0,
        reviewCount: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Hostel.findByIdAndUpdate(hostelId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length
    });
  } catch (error) {
    logger.error('Update hostel rating error:', error);
  }
};