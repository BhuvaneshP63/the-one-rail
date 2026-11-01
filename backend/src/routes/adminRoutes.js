const express = require('express');
const router = express.Router();
const {
  addTrain,
  getTrains,
  getStations,
  addStation,
  editStation,
  deleteStation,
  editTrain,
  deleteTrain,
  getAllBookings,
  getUserAccounts,
  getRevenueStats,
  manageRefunds,
  getAuditLog
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// Protect all admin routes
router.use(protect);
router.use(admin);

router.post('/trains', addTrain);
router.get('/trains', getTrains);
router.get('/stations', getStations);
router.post('/stations', addStation);
router.put('/stations/:id', editStation);
router.delete('/stations/:id', deleteStation);
router.put('/trains/:id', editTrain);
router.delete('/trains/:id', deleteTrain);

router.get('/bookings', getAllBookings);
router.get('/users', getUserAccounts);
router.get('/stats', getRevenueStats);
router.get('/audit', getAuditLog);
router.put('/bookings/:id/refund', manageRefunds);

module.exports = router;
