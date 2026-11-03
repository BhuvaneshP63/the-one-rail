const test = require('node:test');
const assert = require('node:assert/strict');
const { RailRadarTrainDataProvider } = require('../src/services/trainDataProvider');

test('RailRadar station autocomplete uses its directory and sends the key only as a server-side bearer header', async () => {
  let calls = 0;
  const provider = new RailRadarTrainDataProvider({
    apiKey: 'test-secret',
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.match(`${url}`, /\/lookup\/stations$/);
      assert.equal(options.headers.Authorization, 'Bearer test-secret');
      return { ok: true, json: async () => ({ success: true, data: { CBE: 'Coimbatore Junction', MAS: 'Chennai Central' } }) };
    }
  });
  const stations = await provider.autocompleteStations('cbe');
  assert.equal(stations[0].code, 'CBE');
  assert.equal(stations[0].name, 'Coimbatore Junction');
  assert.equal(calls, 1);
});

test('RailRadar coach composition uses the documented train endpoint', async () => {
  const provider = new RailRadarTrainDataProvider({
    apiKey: 'test-secret',
    fetchImpl: async url => {
      assert.match(`${url}`, /\/trains\/12952\/coaches$/);
      return { ok: true, json: async () => ({ success: true, data: { totalCoaches: 23 } }) };
    }
  });
  assert.deepEqual(await provider.getCoachComposition('12952'), { totalCoaches: 23 });
});

test('RailRadar sends the documented reservation query for seat availability', async () => {
  const provider = new RailRadarTrainDataProvider({
    apiKey: 'test-secret',
    fetchImpl: async url => {
      assert.match(`${url}`, /\/trains\/12952\/seats\?source=NDLS&destination=MMCT&journeyDate=2030-01-01&classCode=3A&quotaCode=GN$/);
      return { ok: true, json: async () => ({ success: true, data: { calendar: [] } }) };
    }
  });
  assert.deepEqual(await provider.getSeatAvailability('12952', { from: 'NDLS', to: 'MMCT', date: '2030-01-01', seatClass: '3A' }), { calendar: [] });
});

test('RailRadar preserves provider error details for the API response', async () => {
  const provider = new RailRadarTrainDataProvider({
    apiKey: 'test-secret',
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Slow down' }, meta: { traceId: 'trace-123' } })
    })
  });
  await assert.rejects(provider.getSchedule('12919'), error => error.status === 429 && error.code === 'TOO_MANY_REQUESTS' && error.traceId === 'trace-123');
});

test('RailRadar train search maps real timetable fields without inventing class, fare, or availability data', async () => {
  const provider = new RailRadarTrainDataProvider({
    apiKey: 'test-secret',
    fetchImpl: async url => {
      assert.match(`${url}`, /\/trains\/between\/MAS\/CBE\?date=2030-01-01&live=false$/);
      return { ok: true, json: async () => ({ success: true, data: { trains: [{
        train: { number: '12673', name: 'Cheran Express', type: 'Superfast', runDays: ['mon', 'fri'] },
        from: { departure: '22:10', day: 1 }, to: { arrival: '06:00', day: 2 }, duration: 470, distance: 500, totalHaltsBetween: 12
      }] } }) };
    }
  });
  const trains = await provider.findTrainsBetweenStations({ from: 'MAS', to: 'CBE', date: '2030-01-01' });
  assert.deepEqual(trains[0], {
    trainNumber: '12673', name: 'Cheran Express', type: 'Superfast', runningDays: ['Mon', 'Fri'],
    departureTime: '22:10', arrivalTime: '06:00', departureDay: 1, arrivalDay: 2,
    distanceKm: 500, durationMinutes: 470, totalHalts: 12, runsOnRequestedDate: false, usedDateFallback: false
  });
  assert.equal(Object.hasOwn(trains[0], 'classes'), false);
});

test('RailRadar provider fails clearly when no key is configured', async () => {
  const provider = new RailRadarTrainDataProvider({ apiKey: '', fetchImpl: async () => { throw new Error('must not call'); } });
  await assert.rejects(provider.getStationDirectory(), /RAILRADAR_API_KEY is missing/);
});
