const express = require('express');
const router = express.Router();
const AdHocCharge = require('../../models/AdHocCharge');
const { DateTime } = require('luxon');

router.get('/adhoc-revenue-by-month', async (req, res) => {
  try {
    const charges = await AdHocCharge.find();

    const grouped = {}; // { 'yyyy-MM': netRevenue }

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

    if (!minMonth || !maxMonth) return res.json({ months: [], data: [] });

    // Generate full month range
    const months = [];
    let cursor = minMonth.startOf('month');

    while (cursor <= maxMonth.endOf('month')) {
      const key = cursor.toFormat('yyyy-MM');
      months.push(key);
      cursor = cursor.plus({ months: 1 });
    }

    const data = months.map(month => +(grouped[month] || 0).toFixed(2));

    res.json({ months, data });
  } catch (err) {
    console.error('❌ Error calculating ad hoc revenue:', err);
    res.status(500).send('Error calculating ad hoc revenue');
  }
});

module.exports = router; 
