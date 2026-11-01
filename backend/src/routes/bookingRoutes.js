const express = require('express');
const router = express.Router();
const {
  createBookingOrder,
  verifyPaymentAndAllocate,
  cancelBooking,
  getBookingHistory,
  getBookingDetails,
  downloadTicket,
  checkPnrStatus
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const inventory = require('../controllers/inventoryController');
const safe = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/coaches', safe(inventory.getCoaches));
router.get('/coaches/:coach/seats', safe(inventory.getCoachSeats));
router.post('/hold', protect, safe(inventory.holdSeats));
router.post('/hold/:holdId/release', protect, safe(inventory.releaseHold));

router.post('/create', protect, createBookingOrder);
router.post('/verify', protect, verifyPaymentAndAllocate);
router.post('/:id/cancel', protect, cancelBooking);
router.get('/history', protect, getBookingHistory);
router.get('/pnr/:pnr', protect, checkPnrStatus); // Owner-only simulated PNR enquiry
router.get('/:id/download', protect, downloadTicket);
router.get('/:id', protect, getBookingDetails);

module.exports = router;
