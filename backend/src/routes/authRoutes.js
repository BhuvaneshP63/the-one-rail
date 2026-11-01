const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  getNotifications,
  markNotificationRead,
  getFavorites,
  updateFavorites
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const authRateLimit = require('../middleware/authRateLimit');

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/forgot-password', authRateLimit, forgotPassword);
router.post('/reset-password', authRateLimit, resetPassword);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);
router.get('/favorites', protect, getFavorites);
router.put('/favorites', protect, updateFavorites);

module.exports = router;
