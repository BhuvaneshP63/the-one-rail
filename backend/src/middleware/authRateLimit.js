const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

module.exports = function authRateLimit(req, res, next) {
  const now = Date.now();
  const key = `${req.ip}:${req.baseUrl}${req.path}`;
  let record = attempts.get(key);
  if (!record || record.resetAt <= now) record = { count: 0, resetAt: now + WINDOW_MS };
  record.count += 1;
  attempts.set(key, record);
  if (attempts.size > 10000) {
    for (const [entry, value] of attempts) if (value.resetAt <= now) attempts.delete(entry);
  }
  if (record.count > MAX_ATTEMPTS) {
    res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
    return res.status(429).json({ success: false, message: 'Too many account requests. Wait a while and try again.' });
  }
  next();
};
