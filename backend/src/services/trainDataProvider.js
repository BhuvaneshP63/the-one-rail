// Reservation inventory and bookings stay local. Replace only the timetable provider
// when an authorized railway data API becomes available.
let railRadarStationsCache;
let railRadarTrainsCache;

class SampleTrainDataProvider {
  get sourceLabel() { return 'Sample timetable data (unverified)'; }
  async findTrainsBetweenStations(query) {
    const Train = require('../models/Train');
    const Route = require('../models/Route');
    return Route.find(query.route || {}).populate({ path: 'train', match: { active: true, dataSource: { $in: ['sample', 'external'] } } }).populate('stops.station');
  }
}

class ExternalRailwayDataProvider {
  constructor() { this.sourceLabel = 'External provider not configured'; }
  async findTrainsBetweenStations() { throw new Error('External railway data provider is not configured.'); }
  async getSchedule() { throw new Error('External railway data provider is not configured.'); }
  async getRunningStatus() { throw new Error('External railway data provider is not configured.'); }
  async enquirePnr() { throw new Error('External railway data provider is not configured.'); }
  async enquireFare() { throw new Error('External railway data provider is not configured.'); }
}

class RailRadarTrainDataProvider {
  constructor({ apiKey = process.env.RAILRADAR_API_KEY, baseUrl = process.env.RAILRADAR_API_URL || 'https://api.railradar.in/v1', fetchImpl = global.fetch } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl;
    this.sourceLabel = 'RailRadar timetable data (third-party; confirm with Indian Railways before travel)';
  }

  async request(path, params = {}) {
    if (!this.apiKey) throw new Error('RailRadar is selected but RAILRADAR_API_KEY is missing. Add a provider key to the backend environment.');
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => value != null && value !== '' && url.searchParams.set(key, String(value)));
    let response;
    try {
      response = await this.fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(Number(process.env.TRAIN_DATA_TIMEOUT_MS) || 10000)
      });
    } catch (error) {
      const message = error.name === 'TimeoutError' || error.name === 'AbortError'
        ? 'RailRadar did not respond in time. Please try again.'
        : 'RailRadar could not be reached. Please try again.';
      const providerError = new Error(message);
      providerError.status = 503;
      providerError.cause = error;
      throw providerError;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      const error = new Error(payload.error?.message || payload.message || `RailRadar request failed (${response.status}).`);
      error.status = response.status;
      error.code = payload.error?.code;
      error.traceId = payload.meta?.traceId;
      throw error;
    }
    return payload.data;
  }

  async autocompleteStations(query) {
    const directory = await this.getStationDirectory();
    const needle = query.toLocaleLowerCase();
    return Object.entries(directory).filter(([code, name]) => code.toLocaleLowerCase().includes(needle) || name.toLocaleLowerCase().includes(needle)).slice(0, 10).map(([code, name]) => ({
      code, name, state: '', zone: '',
      dataSource: 'railradar'
    }));
  }

  async findTrainsBetweenStations({ from, to, date }) {
    const path = `/trains/between/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
    let result = await this.request(path, { date, live: false });
    let rows = Array.isArray(result?.trains) ? result.trains : [];
    let usedDateFallback = false;
    if (date && rows.length === 0) {
      result = await this.request(path, { live: false });
      rows = Array.isArray(result?.trains) ? result.trains : [];
      usedDateFallback = rows.length > 0;
    }
    const requestedDay = date ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${date}T12:00:00Z`).getUTCDay()] : null;
    return rows.map(row => {
      const train = row.train || {};
      const days = (train.runDays || []).map(day => `${day}`.slice(0, 3).toLowerCase());
      const dayNames = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
      return {
        trainNumber: `${train.number || ''}`,
        name: train.name || 'Train name unavailable',
        type: train.type || train.category || 'Train',
        runningDays: days.map(day => dayNames[day]).filter(Boolean),
        departureTime: row.from?.departure || '',
        arrivalTime: row.to?.arrival || '',
        departureDay: row.from?.day || 1,
        arrivalDay: row.to?.day || row.from?.day || 1,
        distanceKm: Number(row.distance) || 0,
        durationMinutes: Number(row.duration) || 0,
        totalHalts: Number(row.totalHaltsBetween) || 0,
        runsOnRequestedDate: !requestedDay || days.some(day => dayNames[day] === requestedDay),
        usedDateFallback
      };
    });
  }

  async getSchedule(trainNumber) { return this.request(`/trains/${encodeURIComponent(trainNumber)}`); }
  async getCoachComposition(trainNumber) {
    return this.request(`/trains/${encodeURIComponent(trainNumber)}/coaches`);
  }
  async getSeatAvailability(trainNumber, { from, to, date, seatClass, quota = 'GN' }) {
    return this.request(`/trains/${encodeURIComponent(trainNumber)}/seats`, {
      source: from,
      destination: to,
      journeyDate: date,
      classCode: seatClass,
      quotaCode: quota
    });
  }
  async getFare(trainNumber, { from, to, date, seatClass, quota = 'GN' }) {
    return this.request(`/trains/${encodeURIComponent(trainNumber)}/fare`, {
      source: from,
      destination: to,
      journeyDate: date,
      classCode: seatClass,
      quotaCode: quota
    });
  }
  async getTrainDirectory() {
    if (!this.apiKey) throw new Error('RailRadar is selected but RAILRADAR_API_KEY is missing. Add a provider key to the backend environment.');
    if (!railRadarTrainsCache) railRadarTrainsCache = this.request('/lookup/trains/prs').catch(error => { railRadarTrainsCache = undefined; throw error; });
    return railRadarTrainsCache;
  }
  async getStationDirectory() {
    if (!this.apiKey) throw new Error('RailRadar is selected but RAILRADAR_API_KEY is missing. Add a provider key to the backend environment.');
    if (!railRadarStationsCache) railRadarStationsCache = this.request('/lookup/stations').catch(error => { railRadarStationsCache = undefined; throw error; });
    return railRadarStationsCache;
  }
}

module.exports = {
  getTrainDataProvider: () => process.env.TRAIN_DATA_PROVIDER === 'railradar'
    ? new RailRadarTrainDataProvider()
    : process.env.TRAIN_DATA_PROVIDER === 'external' ? new ExternalRailwayDataProvider() : new SampleTrainDataProvider(),
  SampleTrainDataProvider,
  ExternalRailwayDataProvider,
  RailRadarTrainDataProvider
};
