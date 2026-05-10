const express = require('express');
const router = express.Router();
const AdHocCharge = require('../../models/AdHocCharge');
const { DateTime } = require('luxon');
const cache = require('../../services/cache');

async function computeAdHocRevenueByMonth(yearGroups, postcodeAreas) {
  const ygKey = Array.isArray(yearGroups) && yearGroups.length > 0
    ? [...yearGroups].sort().join(',') : 'all';
  const pcKey = Array.isArray(postcodeAreas) && postcodeAreas.length > 0
    ? [...postcodeAreas].sort().join(',') : 'all';
  const CACHE_KEY = `api:adhoc:adhoc-revenue-by-month:${ygKey}:${pcKey}`;
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const query = {};
  if (Array.isArray(yearGroups) && yearGroups.length > 0) {
    query.year_group = { $in: yearGroups };
  }
  if (Array.isArray(postcodeAreas) && postcodeAreas.length > 0) {
    query.postcode_area = { $in: postcodeAreas };
  }

  const charges = await AdHocCharge.find(query)
    .select('date_occurred client_cost pay_contractor')
    .lean();

  const grouped = {};
  let minMonth = null;
  let maxMonth = null;

  charges.forEach(charge => {
    if (!charge.date_occurred || !charge.client_cost) return;

    const date = DateTime.fromJSDate(charge.date_occurred);
    if (!date.isValid) return;

    const month = date.toFormat('yyyy-MM');

    if (!minMonth || date < minMonth) minMonth = date;
    if (!maxMonth || date > maxMonth) maxMonth = date;

    const clientCost = parseFloat(charge.client_cost || '0');
    const tutorCost = parseFloat(charge.pay_contractor || '0');
    const net = clientCost - (isNaN(tutorCost) ? 0 : tutorCost);

    if (!grouped[month]) grouped[month] = 0;
    grouped[month] += net;
  });

  if (!minMonth || !maxMonth) return { months: [], data: [] };

  const months = [];
  let cursor = minMonth.startOf('month');
  while (cursor <= maxMonth.endOf('month')) {
    months.push(cursor.toFormat('yyyy-MM'));
    cursor = cursor.plus({ months: 1 });
  }

  const data = months.map(month => +(grouped[month] || 0).toFixed(2));

  const payload = { months, data };
  cache.set(CACHE_KEY, payload);
  return payload;
}

router.get('/adhoc-revenue-by-month', async (req, res) => {
  const ygs = req.query.yearGroups ? req.query.yearGroups.split(',').filter(Boolean) : [];
  const areas = req.query.postcodeAreas ? req.query.postcodeAreas.split(',').filter(Boolean) : [];
  try { res.json(await computeAdHocRevenueByMonth(ygs, areas)); }
  catch (err) { console.error('❌ Error calculating ad hoc revenue:', err); res.status(500).send('Error calculating ad hoc revenue'); }
});

module.exports = router;
module.exports.computeAdHocRevenueByMonth = computeAdHocRevenueByMonth;
