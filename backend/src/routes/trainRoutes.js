const express = require('express');
const router = express.Router();
const {
  autocompleteStations,
  searchTrains,
  getRouteStops,
  getReviews,
  addReview
} = require('../controllers/trainController');
const { protect } = require('../middleware/auth');

router.get('/stations/autocomplete', autocompleteStations);
router.get('/search', searchTrains);
router.get('/:id/route', getRouteStops);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', protect, addReview);

module.exports = router;
