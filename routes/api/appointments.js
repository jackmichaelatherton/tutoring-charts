const express = require('express');
const router = express.Router();
const Appointment = require('../../models/Appointment');
const { DateTime } = require('luxon');

// Utility: Safely extract charge & pay rates
function extractRates(app) {
  const rcra = Array.isArray(app.rcras) && app.rcras.length > 0 && typeof app.rcras[0] === 'object' && !Array.isArray(app.rcras[0])
    ? app.rcras[0]
    : null;

  const cja = Array.isArray(app.cjas) && app.cjas.length > 0 && typeof app.cjas[0] === 'object' && !Array.isArray(app.cjas[0])
    ? app.cjas[0]
    : null;

  const clientRate = parseFloat(rcra?.charge_rate) || parseFloat(app.service?.dft_charge_rate || 0);
  const tutorRate = parseFloat(cja?.pay_rate) || parseFloat(app.service?.dft_contractor_rate || 0);

  return { clientRate, tutorRate };
}

// 📊 Total Commission by Month
router.get('/total-commission-by-month', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const grouped = {};

    appointments.forEach(app => {
      const start = DateTime.fromJSDate(app.start);
      if (!start.isValid) return;

      const month = start.toFormat('yyyy-MM');
      const status = (app.status || 'unknown').toLowerCase();
      const { clientRate, tutorRate } = extractRates(app);

      if (!clientRate || !tutorRate) return;
      const commission = clientRate - tutorRate;

      if (!grouped[month]) grouped[month] = {};
      if (!grouped[month][status]) grouped[month][status] = 0;

      grouped[month][status] += commission;
    });

    const allMonths = Object.keys(grouped).sort();
    const allStatuses = [...new Set(allMonths.flatMap(month => Object.keys(grouped[month])))];

    const result = allStatuses.map(status => ({
      status,
      data: allMonths.map(month => grouped[month][status] || 0)
    }));

    res.json({ months: allMonths, statuses: result });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error calculating total commission');
  }
});

// 📈 Average Commission Rate by Month
router.get('/avg-commission-by-month', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const grouped = {};

    appointments.forEach(app => {
      const start = DateTime.fromJSDate(app.start);
      const finish = DateTime.fromJSDate(app.finish);
      if (!start.isValid || !finish.isValid) return;

      const duration = finish.diff(start, 'hours').hours;
      if (!duration || duration <= 0) return;

      const { clientRate, tutorRate } = extractRates(app);
      if (!clientRate || !tutorRate) return;

      const commission = clientRate - tutorRate;
      const month = start.toFormat('yyyy-MM');
      const status = (app.status || 'unknown').toLowerCase();

      if (!grouped[month]) grouped[month] = {};
      if (!grouped[month][status]) {
        grouped[month][status] = { totalCommission: 0, totalHours: 0 };
      }

      grouped[month][status].totalCommission += commission;
      grouped[month][status].totalHours += duration;
    });

    const allMonths = Object.keys(grouped).sort();
    const allStatuses = [...new Set(allMonths.flatMap(month => Object.keys(grouped[month])))];

    const result = allStatuses.map(status => ({
      status,
      data: allMonths.map(month => {
        const entry = grouped[month][status];
        if (!entry) return { totalCommission: 0, totalHours: 0 };
        return {
          totalCommission: +entry.totalCommission.toFixed(2),
          totalHours: +entry.totalHours.toFixed(2)
        };
      })
    }));

    res.json({ months: allMonths, statuses: result });
  } catch (err) {
    console.error('❌ Error calculating average commission rate:', err);
    res.status(500).send('Error calculating average commission rate');
  }
});

// ⏱ Lesson Hours by Month
router.get('/by-month', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const grouped = {};

    appointments.forEach(app => {
      const startDT = DateTime.fromJSDate(app.start);
      const finishDT = DateTime.fromJSDate(app.finish);
      if (!startDT.isValid || !finishDT.isValid) return;

      const durationHours = finishDT.diff(startDT, 'hours').hours;
      const monthKey = startDT.toFormat('yyyy-MM');
      const status = (app.status || 'unknown').toLowerCase();

      if (!grouped[monthKey]) grouped[monthKey] = {};
      if (!grouped[monthKey][status]) grouped[monthKey][status] = 0;

      grouped[monthKey][status] += durationHours;
    });

    const allMonths = Object.keys(grouped).sort();
    const allStatuses = [...new Set(allMonths.flatMap(month => Object.keys(grouped[month])))];

    const result = allStatuses.map(status => ({
      status,
      data: allMonths.map(month => grouped[month][status] || 0)
    }));

    res.json({ months: allMonths, statuses: result });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating appointment chart data');
  }
});

router.get('/complete-commission-by-month', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const grouped = {}; // { month: totalCommission }

    appointments.forEach(app => {
      const start = DateTime.fromJSDate(app.start);
      if (!start.isValid) return;

      const status = (app.status || 'unknown').toLowerCase();
      if (status !== 'complete') return;

      const clientRate = parseFloat(app.rcras?.[0]?.charge_rate) ||
                         parseFloat(app.service?.dft_charge_rate || 0);
      const tutorRate = parseFloat(app.cjas?.[0]?.pay_rate) ||
                        parseFloat(app.service?.dft_contractor_rate || 0);

      if (!clientRate || !tutorRate) return;

      const commission = clientRate - tutorRate;
      const month = start.toFormat('yyyy-MM');

      grouped[month] = (grouped[month] || 0) + commission;
    });

    const allMonths = Object.keys(grouped).sort();
    const data = allMonths.map(month => grouped[month] || 0);

    res.json({ months: allMonths, data });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error calculating complete commission');
  }
});

module.exports = router;
