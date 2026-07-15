const express = require('express');
const router = express.Router();
const {
  addTrain,
  editTrain,
  deleteTrain,
  getAllBookings,
  getUserAccounts,
  getRevenueStats,
  manageRefunds
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// Protect all admin routes
router.use(protect);
router.use(admin);

router.post('/trains', addTrain);
router.put('/trains/:id', editTrain);
router.delete('/trains/:id', deleteTrain);

router.get('/bookings', getAllBookings);
router.get('/users', getUserAccounts);
router.get('/stats', getRevenueStats);
router.put('/bookings/:id/refund', manageRefunds);

module.exports = router;
