const SAMPLE_FARE_SCALE = 0.05;
const MIN_SAMPLE_FARE = 50;

function calculateSampleFare(distanceKm, classRate = 1.5) {
  const distance = Number(distanceKm);
  const rate = Number(classRate);
  if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(rate) || rate < 0) {
    throw new TypeError('Sample fare distance and class rate must be non-negative numbers.');
  }
  // Keep the demo price estimate lower than the original scale, rounded to ₹10.
  return Math.max(MIN_SAMPLE_FARE, Math.round(distance * rate * SAMPLE_FARE_SCALE) * 10);
}

module.exports = { calculateSampleFare, SAMPLE_FARE_SCALE, MIN_SAMPLE_FARE };
