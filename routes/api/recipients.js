const express = require('express');
const router = express.Router();
const Appointment = require('../../models/Appointment');
const { DateTime } = require('luxon');
const cache = require('../../services/cache');

const RCRA_PROJECTION = 'start status rcras.recipient year_group postcode_area';

function buildQuery(yearGroups, postcodeAreas) {
  const q = { status: 'complete' };
  if (Array.isArray(yearGroups) && yearGroups.length > 0) {
    q.year_group = { $in: yearGroups };
  }
  if (Array.isArray(postcodeAreas) && postcodeAreas.length > 0) {
    q.postcode_area = { $in: postcodeAreas };
  }
  return q;
}

function filterKey(base, yearGroups, postcodeAreas) {
  const ygKey = Array.isArray(yearGroups) && yearGroups.length > 0
    ? [...yearGroups].sort().join(',') : 'all';
  const pcKey = Array.isArray(postcodeAreas) && postcodeAreas.length > 0
    ? [...postcodeAreas].sort().join(',') : 'all';
  return `${base}:${ygKey}:${pcKey}`;
}

async function computeStartsByMonth(yearGroups, postcodeAreas) {
  const CACHE_KEY = filterKey('api:recipients:starts-by-month', yearGroups, postcodeAreas);
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const completedAppointments = await Appointment.find(buildQuery(yearGroups, postcodeAreas))
    .sort({ start: 1 })
    .select(RCRA_PROJECTION)
    .lean();

  const recipientFirstStart = {};

  completedAppointments.forEach(app => {
    if (!Array.isArray(app.rcras)) return;
    app.rcras.forEach(rcra => {
      const recipientId = rcra.recipient;
      if (!recipientId) return;
      if (!recipientFirstStart[recipientId]) {
        recipientFirstStart[recipientId] = app.start;
      }
    });
  });

  const grouped = {};
  Object.values(recipientFirstStart).forEach(date => {
    const dt = DateTime.fromJSDate(date);
    if (!dt.isValid) return;
    const month = dt.toFormat('yyyy-MM');
    grouped[month] = (grouped[month] || 0) + 1;
  });

  const months = Object.keys(grouped).sort();
  const counts = months.map(month => grouped[month]);

  const payload = { months, counts };
  cache.set(CACHE_KEY, payload);
  return payload;
}

async function computeFinishesByMonth(yearGroups, postcodeAreas) {
  const CACHE_KEY = filterKey('api:recipients:finishes-by-month', yearGroups, postcodeAreas);
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const completedAppointments = await Appointment.find(buildQuery(yearGroups, postcodeAreas))
    .sort({ start: 1 })
    .select(RCRA_PROJECTION)
    .lean();

  const recipientAppointments = {};

  completedAppointments.forEach(app => {
    if (!Array.isArray(app.rcras)) return;
    app.rcras.forEach(rcra => {
      const recipientId = rcra.recipient;
      if (!recipientId) return;
      if (!recipientAppointments[recipientId]) recipientAppointments[recipientId] = [];
      recipientAppointments[recipientId].push(app.start);
    });
  });

  const finishes = [];
  const now = DateTime.now();

  Object.values(recipientAppointments).forEach(datesArr => {
    const sortedDates = datesArr
      .map(d => DateTime.fromJSDate(d))
      .filter(dt => dt.isValid)
      .sort((a, b) => a - b);

    if (sortedDates.length === 0) return;

    const last = sortedDates[sortedDates.length - 1];
    if (last.plus({ days: 28 }) < now) finishes.push(last);
  });

  const grouped = {};
  finishes.forEach(dt => {
    const month = dt.toFormat('yyyy-MM');
    grouped[month] = (grouped[month] || 0) + 1;
  });

  const months = Object.keys(grouped).sort();
  const counts = months.map(month => grouped[month]);

  const payload = { months, counts };
  cache.set(CACHE_KEY, payload);
  return payload;
}

router.get('/starts-by-month', async (req, res) => {
  const ygs = req.query.yearGroups ? req.query.yearGroups.split(',').filter(Boolean) : [];
  const areas = req.query.postcodeAreas ? req.query.postcodeAreas.split(',').filter(Boolean) : [];
  try { res.json(await computeStartsByMonth(ygs, areas)); }
  catch (err) { console.error('❌ Error calculating recipient starts by month:', err); res.status(500).send('Error calculating recipient starts by month'); }
});

router.get('/finishes-by-month', async (req, res) => {
  const ygs = req.query.yearGroups ? req.query.yearGroups.split(',').filter(Boolean) : [];
  const areas = req.query.postcodeAreas ? req.query.postcodeAreas.split(',').filter(Boolean) : [];
  try { res.json(await computeFinishesByMonth(ygs, areas)); }
  catch (err) { console.error('❌ Error calculating finishes by month:', err); res.status(500).send('Error calculating finishes by month'); }
});

module.exports = router;
module.exports.computeStartsByMonth = computeStartsByMonth;
module.exports.computeFinishesByMonth = computeFinishesByMonth;
