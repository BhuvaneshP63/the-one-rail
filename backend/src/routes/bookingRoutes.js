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

router.post('/create', protect, createBookingOrder);
router.post('/verify', protect, verifyPaymentAndAllocate);
router.post('/:id/cancel', protect, cancelBooking);
router.get('/history', protect, getBookingHistory);
router.get('/pnr/:pnr', checkPnrStatus); // Public endpoint for PNR check
router.get('/:id/download', protect, downloadTicket);
router.get('/:id', protect, getBookingDetails);

module.exports = router;
