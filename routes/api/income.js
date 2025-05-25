const express = require('express');
const router = express.Router();
const { DateTime } = require('luxon');
const Appointment = require('../../models/Appointment');
const AdHocCharge = require('../../models/AdHocCharge');

// Utility to generate month keys
const generateMonthKeys = (start, end) => {
  const months = [];
  let curr = DateTime.fromFormat(start, 'yyyy-MM');
  const last = DateTime.fromFormat(end, 'yyyy-MM');
  while (curr <= last) {
    months.push(curr.toFormat('yyyy-MM'));
    curr = curr.plus({ months: 1 });
  }
  return months;
};

router.get('/total-income-by-month', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const adHocCharges = await AdHocCharge.find();

    const commissionByMonth = {};
    const adHocByMonth = {};

    // Appointments: Compute commission
    for (const app of appointments) {
      const start = DateTime.fromJSDate(app.start);
      if (!start.isValid) continue;

      const month = start.toFormat('yyyy-MM');

      const validRcra = Array.isArray(app.rcras) && typeof app.rcras[0] === 'object' && app.rcras[0] !== null;
      const validCja = Array.isArray(app.cjas) && typeof app.cjas[0] === 'object' && app.cjas[0] !== null;

      const clientRate = validRcra
        ? parseFloat(app.rcras[0].charge_rate)
        : parseFloat(app.service?.dft_charge_rate || 0);

      const tutorRate = validCja
        ? parseFloat(app.cjas[0].pay_rate)
        : parseFloat(app.service?.dft_contractor_rate || 0);

      if (!clientRate || !tutorRate) continue;

      const commission = clientRate - tutorRate;
      commissionByMonth[month] = (commissionByMonth[month] || 0) + commission;
    }

    // Ad Hoc: Compute net revenue
    for (const charge of adHocCharges) {
      const date = DateTime.fromJSDate(charge.date_occurred || charge.createdAt);
      if (!date.isValid) continue;

      const month = date.toFormat('yyyy-MM');
      const clientCost = parseFloat(charge.client_cost || 0);
      const payContractor = parseFloat(charge.pay_contractor || 0);
      const otherCosts = 0; // extend if needed

      const net = clientCost - (payContractor + otherCosts);
      adHocByMonth[month] = (adHocByMonth[month] || 0) + net;
    }

    // Combine and pad across month range
    const allMonths = Array.from(new Set([
      ...Object.keys(commissionByMonth),
      ...Object.keys(adHocByMonth)
    ])).sort();

    const months = generateMonthKeys(allMonths[0], allMonths[allMonths.length - 1]);

    const commissionData = months.map(m => commissionByMonth[m] || 0);
    const adHocData = months.map(m => adHocByMonth[m] || 0);

    res.json({
      months,
      commissionData,
      adHocData
    });
  } catch (err) {
    console.error('❌ Error in total income API:', err);
    res.status(500).send('Error calculating total income');
  }
});

module.exports = router;
