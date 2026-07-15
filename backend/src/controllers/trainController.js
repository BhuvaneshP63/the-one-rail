const mongoose = require('mongoose');
const Station = require('../models/Station');
const Train = require('../models/Train');
const Route = require('../models/Route');
const Review = require('../models/Review');
const { checkAvailability } = require('../utils/seatAllocator');

// Get day name from date string
const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// Calculate duration between arrival and departure times (accounting for day differences)
const calculateDuration = (depTime, arrTime, depDay, arrDay) => {
  const [depH, depM] = depTime.split(':').map(Number);
  const [arrH, arrM] = arrTime.split(':').map(Number);
  
  let totalDepMins = depH * 60 + depM;
  let totalArrMins = arrH * 60 + arrM + (arrDay - depDay) * 1440;
  
  const diffMins = totalArrMins - totalDepMins;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  return `${hours}h ${mins}m`;
};

// @desc    Autocomplete stations
// @route   GET /api/trains/stations/autocomplete
// @access  Public
exports.autocompleteStations = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json([]);
    }

    const stations = await Station.find({
      $or: [
        { code: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { state: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);

    res.json(stations);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search trains between stations on a date
// @route   GET /api/trains/search
// @access  Public
exports.searchTrains = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ success: false, message: 'From, To and Date are required query parameters' });
    }

    // 1. Resolve source and destination stations (accept code or ObjectId)
    const fromStation = await Station.findOne({ $or: [{ code: from.toUpperCase() }, { _id: mongoose.Types.ObjectId.isValid(from) ? from : null }] });
    const toStation = await Station.findOne({ $or: [{ code: to.toUpperCase() }, { _id: mongoose.Types.ObjectId.isValid(to) ? to : null }] });

    if (!fromStation || !toStation) {
      return res.status(404).json({ success: false, message: 'Source or destination station not found' });
    }

    // Get weekday for date
    const reqDay = getDayName(date);

    // 2. Fetch routes and filter trains that go from -> to
    const routes = await Route.find()
      .populate({
        path: 'train',
        populate: [
          { path: 'source' },
          { path: 'destination' }
        ]
      })
      .populate('stops.station');

    const matchingTrains = [];

    for (const route of routes) {
      const train = route.train;
      if (!train || !train.active) continue;

      // Check if train runs on requested day of week
      if (!train.runsOn.includes(reqDay)) continue;

      const fromStop = route.stops.find(stop => stop.station._id.toString() === fromStation._id.toString());
      const toStop = route.stops.find(stop => stop.station._id.toString() === toStation._id.toString());

      // Ensure stops exist and boarding is before destination
      if (fromStop && toStop && fromStop.stopIndex < toStop.stopIndex) {
        const distance = toStop.distanceKm - fromStop.distanceKm;
        
        // Calculate dynamic availability and fares for each class supported by the train
        const availabilityAndFares = {};
        
        for (const cls of train.classes) {
          const avail = await checkAvailability(
            train._id,
            date,
            cls,
            fromStop.stopIndex,
            toStop.stopIndex,
            train.classes
          );

          // Calculate fare: base fare rate per class * distance (min. Rs 50)
          const multiplier = train.baseFare[cls] || 1.5;
          const rawFare = Math.round(distance * multiplier * 0.1) * 10; // Round to nearest 10
          const fare = Math.max(50, rawFare);

          availabilityAndFares[cls] = {
            availableSeats: avail.availableSeats,
            totalSeats: avail.totalSeats,
            fare
          };
        }

        // Get train rating
        const reviewsCount = await Review.countDocuments({ train: train._id });
        const avgRatingResult = await Review.aggregate([
          { $match: { train: train._id } },
          { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);
        const rating = avgRatingResult.length > 0 ? parseFloat(avgRatingResult[0].avg.toFixed(1)) : 4.0;

        matchingTrains.push({
          trainId: train._id,
          trainNumber: train.trainNumber,
          name: train.name,
          source: train.source.name,
          sourceCode: train.source.code,
          destination: train.destination.name,
          destinationCode: train.destination.code,
          boardingStation: {
            id: fromStation._id,
            name: fromStation.name,
            code: fromStation.code,
            arrivalTime: fromStop.arrivalTime,
            departureTime: fromStop.departureTime,
            stopIndex: fromStop.stopIndex
          },
          deboardingStation: {
            id: toStation._id,
            name: toStation.name,
            code: toStation.code,
            arrivalTime: toStop.arrivalTime,
            departureTime: toStop.departureTime,
            stopIndex: toStop.stopIndex
          },
          duration: calculateDuration(
            fromStop.departureTime,
            toStop.arrivalTime,
            fromStop.dayNumber,
            toStop.dayNumber
          ),
          runningDays: train.runsOn,
          classes: train.classes,
          classDetails: availabilityAndFares,
          rating,
          reviewsCount
        });
      }
    }

    res.json({
      success: true,
      searchCriteria: {
        from: fromStation.name,
        to: toStation.name,
        date,
        day: reqDay
      },
      trainsCount: matchingTrains.length,
      trains: matchingTrains
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get train route stops
// @route   GET /api/trains/:id/route
// @access  Public
exports.getRouteStops = async (req, res) => {
  try {
    const route = await Route.findOne({ train: req.params.id })
      .populate('train')
      .populate('stops.station');

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found for this train' });
    }

    res.json({ success: true, route });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reviews for a train
// @route   GET /api/trains/:id/reviews
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ train: req.params.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a review for a train
// @route   POST /api/trains/:id/reviews
// @access  Private
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }

    const review = await Review.create({
      user: req.user._id,
      train: req.params.id,
      rating,
      comment
    });

    res.status(201).json({ success: true, message: 'Review added successfully', review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
