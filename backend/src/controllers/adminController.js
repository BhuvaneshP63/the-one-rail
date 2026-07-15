const Train = require('../models/Train');
const Route = require('../models/Route');
const Station = require('../models/Station');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Payment = require('../models/Payment');

// @desc    Add a new train and its route stops
// @route   POST /api/admin/trains
// @access  Private/Admin
exports.addTrain = async (req, res) => {
  const session = await Train.startSession();
  session.startTransaction();
  try {
    const { trainNumber, name, sourceCode, destinationCode, classes, runsOn, baseFare, stops } = req.body;

    if (!trainNumber || !name || !sourceCode || !destinationCode || !classes || !runsOn || !stops || stops.length < 2) {
      return res.status(400).json({ success: false, message: 'Invalid train data. Check stops count (min 2).' });
    }

    // Resolve source and destination
    const srcStation = await Station.findOne({ code: sourceCode.toUpperCase() });
    const destStation = await Station.findOne({ code: destinationCode.toUpperCase() });

    if (!srcStation || !destStation) {
      return res.status(404).json({ success: false, message: 'Source or Destination station not found' });
    }

    const train = new Train({
      trainNumber,
      name,
      source: srcStation._id,
      destination: destStation._id,
      classes,
      runsOn,
      baseFare
    });

    await train.save({ session });

    // Build stops list from station codes
    const stopsList = [];
    for (const stop of stops) {
      const station = await Station.findOne({ code: stop.stationCode.toUpperCase() });
      if (!station) {
        throw new Error(`Station code ${stop.stationCode} in stops list not found`);
      }

      stopsList.push({
        station: station._id,
        stopIndex: stop.stopIndex,
        arrivalTime: stop.arrivalTime,
        departureTime: stop.departureTime,
        distanceKm: stop.distanceKm,
        dayNumber: stop.dayNumber || 1
      });
    }

    const route = new Route({
      train: train._id,
      stops: stopsList
    });

    await route.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: 'Train and Route created successfully', train });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Edit an existing train details
// @route   PUT /api/admin/trains/:id
// @access  Private/Admin
exports.editTrain = async (req, res) => {
  try {
    const { name, classes, runsOn, baseFare, active } = req.body;
    const train = await Train.findById(req.params.id);

    if (!train) {
      return res.status(404).json({ success: false, message: 'Train not found' });
    }

    if (name) train.name = name;
    if (classes) train.classes = classes;
    if (runsOn) train.runsOn = runsOn;
    if (baseFare) train.baseFare = baseFare;
    if (active !== undefined) train.active = active;

    await train.save();

    res.json({ success: true, message: 'Train details updated successfully', train });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a train and its associated route
// @route   DELETE /api/admin/trains/:id
// @access  Private/Admin
exports.deleteTrain = async (req, res) => {
  const session = await Train.startSession();
  session.startTransaction();
  try {
    const trainId = req.params.id;
    const train = await Train.findById(trainId);
    if (!train) {
      return res.status(404).json({ success: false, message: 'Train not found' });
    }

    await Train.findByIdAndDelete(trainId, { session });
    await Route.findOneAndDelete({ train: trainId }, { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Train and Route deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    View all bookings in the system
// @route   GET /api/admin/bookings
// @access  Private/Admin
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .populate('train', 'trainNumber name')
      .populate('source', 'name code')
      .populate('destination', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    View all registered user accounts
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUserAccounts = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard financial and user statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getRevenueStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalTrains = await Train.countDocuments({ active: true });

    // Calculate Gross and Net Revenue
    const revenueSummary = await Booking.aggregate([
      {
        $group: {
          _id: null,
          grossRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalFare', 0]
            }
          },
          refundedAmount: { $sum: '$refundAmount' }
        }
      }
    ]);

    const grossRevenue = revenueSummary.length > 0 ? revenueSummary[0].grossRevenue : 0;
    const refundedAmount = revenueSummary.length > 0 ? revenueSummary[0].refundedAmount : 0;
    const netRevenue = grossRevenue - refundedAmount;

    // Class wise bookings split
    const classSplit = await Booking.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: '$seatClass', count: { $sum: 1 }, revenue: { $sum: '$totalFare' } } }
    ]);

    // Trend analysis over last 7 bookings or dates
    const dailyTrend = await Booking.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      {
        $group: {
          _id: '$date',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalFare' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 10 }
    ]);

    // Map trends to UI labels
    const trends = dailyTrend.map(d => ({
      date: d._id,
      bookings: d.bookings,
      revenue: d.revenue
    }));

    res.json({
      success: true,
      metrics: {
        totalBookings,
        totalUsers,
        totalTrains,
        grossRevenue,
        refundedAmount,
        netRevenue
      },
      classSplit,
      trends
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update refund request status
// @route   PUT /api/admin/bookings/:id/refund
// @access  Private/Admin
exports.manageRefunds = async (req, res) => {
  try {
    const { refundStatus } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot process refund for active booking' });
    }

    if (refundStatus) booking.refundStatus = refundStatus;
    await booking.save();

    res.json({ success: true, message: 'Refund status updated successfully', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
