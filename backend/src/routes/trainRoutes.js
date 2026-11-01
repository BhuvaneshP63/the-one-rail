const express = require('express');
const router = express.Router();
const {
  autocompleteStations,
  searchTrains,
  getTrainDirectory,
  getProviderSchedule,
  getRouteStops,
  getReviews,
  addReview
} = require('../controllers/trainController');
const { protect } = require('../middleware/auth');

router.get('/stations/autocomplete', autocompleteStations);
router.get('/directory', getTrainDirectory);
router.get('/external/:trainNumber/schedule', getProviderSchedule);
router.get('/search', searchTrains);
router.get('/:id/route', getRouteStops);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', protect, addReview);

module.exports = router;
