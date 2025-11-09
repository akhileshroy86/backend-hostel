import { Request, Response } from 'express';
import { Hostel } from '../models/Hostel';
import { AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';

export const createHostel = async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, description, address, contact, amenities, rooms, images, googleMapsUrl } = req.body;
    
    // Generate room IDs and format rooms
    const formattedRooms = rooms.map((room: any, index: number) => ({
      roomId: `${name.toLowerCase().replace(/\s+/g, '-')}-${room.type}-${index + 1}`,
      type: room.type,
      pricePerMonth: room.price,
      capacity: room.capacity,
      availabilityCount: room.available
    }));

    // Mock coordinates (no map functionality)
    const coordinates = [77.5946, 12.9716]; // Default coordinates
    
    // Map frontend type values to backend enum values
    const typeMapping: { [key: string]: string } = {
      'boys_hostel': 'boys',
      'boyshostel': 'boys',
      'girls_hostel': 'girls',
      'girlshostel': 'girls',
      'co_living': 'co-living',
      'coliving': 'co-living',
      'pg': 'pg',
      'student': 'student',
      'travelers': 'travelers'
    };
    
    logger.info('Received hostel type:', type);
    const mappedType = typeMapping[type] || type;
    logger.info('Mapped hostel type:', mappedType);
    
    const hostel = new Hostel({
      ownerId: req.user._id,
      name,
      type: mappedType,
      description,
      address: {
        street: address.street,
        area: address.area,
        city: address.city,
        state: address.state,
        pincode: address.pincode
      },
      location: {
        type: 'Point',
        coordinates: coordinates
      },
      contact,
      rooms: formattedRooms,
      amenities: amenities || [],
      images: images || [],
      googleMapsUrl: googleMapsUrl || '',
      rating: 0,
      reviewCount: 0
    });

    await hostel.save();
    
    res.status(201).json({
      message: 'Hostel created successfully',
      hostel
    });
  } catch (error) {
    logger.error('Create hostel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHostels = async (req: Request, res: Response) => {
  try {
    const { 
      q, location, type, minPrice, maxPrice, amenities,
      page = 1, limit = 20 
    } = req.query;

    let query: any = { verified: true }; // Only show verified hostels
    let orConditions: any[] = [];

    // Text search
    if (q && q.trim() !== '') {
      orConditions.push(
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'address.area': { $regex: q, $options: 'i' } },
        { 'address.city': { $regex: q, $options: 'i' } }
      );
    }

    // Location search
    if (location && location.trim() !== '') {
      orConditions.push(
        { 'address.city': { $regex: location, $options: 'i' } },
        { 'address.area': { $regex: location, $options: 'i' } }
      );
    }

    // Apply OR conditions if any exist
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }

    // Type filter
    if (type && type.trim() !== '') {
      query.type = type;
    }

    // Amenities filter
    if (amenities) {
      const amenityList = (amenities as string).split(',');
      query.amenities = { $in: amenityList };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Execute query
    const hostels = await Hostel.find(query)
      .populate('ownerId', 'name phone')
      .skip(skip)
      .limit(parseInt(limit as string))
      .sort({ createdAt: -1, rating: -1 });

    const total = await Hostel.countDocuments(query);

    res.json({
      hostels,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Get hostels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHostelById = async (req: Request, res: Response) => {
  try {
    const hostel = await Hostel.findById(req.params.id).populate('ownerId', 'name phone email');
    
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    res.json({ hostel });
  } catch (error) {
    logger.error('Get hostel by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOwnerHostels = async (req: AuthRequest, res: Response) => {
  try {
    const hostels = await Hostel.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({ hostels });
  } catch (error) {
    logger.error('Get owner hostels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateHostel = async (req: AuthRequest, res: Response) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    if (hostel.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    Object.assign(hostel, req.body);
    hostel.updatedAt = new Date();
    
    await hostel.save();
    
    res.json({
      message: 'Hostel updated successfully',
      hostel
    });
  } catch (error) {
    logger.error('Update hostel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRoomPrice = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, roomId } = req.params;
    const { price } = req.body;
    
    const hostel = await Hostel.findById(hostelId);
    
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    if (hostel.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const room = hostel.rooms.find(r => r.roomId === roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    room.pricePerMonth = price;
    hostel.updatedAt = new Date();
    
    await hostel.save();
    
    res.json({
      message: 'Room price updated successfully',
      hostel
    });
  } catch (error) {
    logger.error('Update room price error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};