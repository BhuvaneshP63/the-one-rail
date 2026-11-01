require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');
const SeatInventory = require('../src/models/SeatInventory');

const testMongoUri = process.env.MONGODB_TEST_URI;
const apiBase = process.env.TEST_API_BASE_URL?.replace(/\/$/, '');
const email = `one-rail-smoke-${Date.now()}@example.test`;
const password = `Smoke-${Date.now()}-Pass!`;
let createdUserId;

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await response.json() : await response.arrayBuffer();
  if (!response.ok) throw Object.assign(new Error(payload.message || `Request failed: ${response.status}`), { status: response.status });
  return { response, payload };
}

async function main() {
  if (!testMongoUri || !apiBase) throw new Error('Set MONGODB_TEST_URI and TEST_API_BASE_URL for an isolated end-to-end check.');
  let databaseName;
  try { databaseName = new URL(testMongoUri).pathname.replace(/^\//, '').split('?')[0]; } catch { throw new Error('MONGODB_TEST_URI is not a valid MongoDB connection URI.'); }
  if (!/_test$/i.test(databaseName)) throw new Error('MONGODB_TEST_URI must point to a database whose name ends with _test.');
  await mongoose.connect(testMongoUri);
  try {
    const registered = await request('/auth/register', { method: 'POST', body: { name: 'One Rail Smoke Check', email, password, phone: '9000000000' } });
    createdUserId = registered.payload.user.id;
    const login = await request('/auth/login', { method: 'POST', body: { email, password } });
    const token = login.payload.token;

    const search = await request('/trains/search?from=NDLS&to=CSMT&date=2030-01-01');
    const train = search.payload.trains.find(item => item.trainNumber === '92001');
    if (!train) throw new Error('Add the sample train records first with npm run seed:sample.');
    const coachList = await request(`/bookings/coaches?trainId=${train.trainId}&date=2030-01-01&seatClass=SL`);
    const coach = coachList.payload.coaches[0].coach;
    const layout = await request(`/bookings/coaches/${coach}/seats?trainId=${train.trainId}&date=2030-01-01&seatClass=SL`);
    const seat = layout.payload.seats.find(item => item.status === 'AVAILABLE');
    if (!seat) throw new Error('No sample seat is available for the smoke check.');

    const holdAttempts = await Promise.allSettled([1, 2].map(() => request('/bookings/hold', { method: 'POST', token, body: { trainId: train.trainId, date: '2030-01-01', seatClass: 'SL', coach, seatNumbers: [seat.seatNumber] } })));
    const hold = holdAttempts.find(result => result.status === 'fulfilled')?.value;
    const rejectedAttempt = holdAttempts.find(result => result.status === 'rejected');
    if (!hold || !rejectedAttempt || rejectedAttempt.reason.status !== 409) throw new Error('Concurrent seat holds did not produce exactly one successful reservation and one conflict.');
    const competingHoldRejected = true;
    const created = await request('/bookings/create', { method: 'POST', token, body: {
      trainId: train.trainId, date: '2030-01-01', seatClass: 'SL', fromStation: train.boardingStation.id,
      toStation: train.deboardingStation.id, boardingStation: train.boardingStation.id, holdId: hold.payload.holdId,
      seats: [{ coach, seatNumber: seat.seatNumber }], passengers: [{ name: 'Smoke Passenger', age: 42, gender: 'Other', preferredBerth: 'Lower Berth' }]
    } });
    const confirmed = await request('/bookings/verify', { method: 'POST', token, body: { bookingId: created.payload.booking.id, orderId: created.payload.booking.razorpayOrderId, paymentId: 'pay_mock_smoke', method: 'Mock' } });
    if (confirmed.payload.booking.passengers[0].seatNumber !== seat.seatNumber || confirmed.payload.booking.passengers[0].coach !== coach) throw new Error('The selected seat was not persisted.');
    const details = await request(`/bookings/pnr/${created.payload.booking.pnr}`, { token });
    const ticket = await request(`/bookings/${created.payload.booking.id}/download`, { token });
    if (!ticket.response.headers.get('content-type')?.includes('application/pdf')) throw new Error('Ticket download did not return a PDF.');
    const cancellation = await request(`/bookings/${created.payload.booking.id}/cancel`, { method: 'POST', token });
    const refreshed = await request(`/bookings/coaches/${coach}/seats?trainId=${train.trainId}&date=2030-01-01&seatClass=SL`);
    const released = refreshed.payload.seats.find(item => item.seatNumber === seat.seatNumber)?.status === 'AVAILABLE';
    if (!released) throw new Error('Cancellation did not release the selected seat.');

    const abandonedSeat = refreshed.payload.seats.find(item => item.status === 'AVAILABLE' && item.seatNumber !== seat.seatNumber);
    const abandonedHold = await request('/bookings/hold', { method: 'POST', token, body: { trainId: train.trainId, date: '2030-01-01', seatClass: 'SL', coach, seatNumbers: [abandonedSeat.seatNumber] } });
    await request(`/bookings/hold/${abandonedHold.payload.holdId}/release`, { method: 'POST', token });
    const afterExplicitRelease = await request(`/bookings/coaches/${coach}/seats?trainId=${train.trainId}&date=2030-01-01&seatClass=SL`);
    const explicitRelease = afterExplicitRelease.payload.seats.find(item => item.seatNumber === abandonedSeat.seatNumber)?.status === 'AVAILABLE';
    if (!explicitRelease) throw new Error('Explicitly released hold did not return the seat to availability.');

    console.log(JSON.stringify({ registration: 'ok', login: 'ok', search: 'ok', seatHold: 'ok', competingHold: 'rejected', exactSeatSaved: `${coach}/${seat.seatNumber}`, simulatedPnr: details.payload.booking.pnr, pdf: 'ok', cancellation: cancellation.payload.success, seatReleased: released, explicitHoldRelease: explicitRelease }));
  } finally {
    if (createdUserId) {
      const bookings = await Booking.find({ user: createdUserId }).select('_id');
      const bookingIds = bookings.map(booking => booking._id);
      await SeatInventory.updateMany({ $or: [{ booking: { $in: bookingIds } }, { holdBy: createdUserId }] }, { $set: { status: 'AVAILABLE' }, $unset: { booking: 1, holdBy: 1, holdId: 1, holdExpiresAt: 1 } });
      await Payment.deleteMany({ booking: { $in: bookingIds } });
      await Booking.deleteMany({ user: createdUserId });
      await Notification.deleteMany({ user: createdUserId });
      await User.deleteOne({ _id: createdUserId, email });
    }
    await mongoose.disconnect();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
