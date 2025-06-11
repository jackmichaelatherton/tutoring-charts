const express = require('express');
const router = express.Router();
const Appointment = require('../../models/Appointment');
const { DateTime } = require('luxon');

// 📊 Starts per Month (first completed appointment per recipient)
router.get('/starts-by-month', async (req, res) => {
  try {
    const completedAppointments = await Appointment.find({ status: 'complete' }).sort({ start: 1 });

    // Map: recipientId -> first completed appointment date
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

    // Group by month
    const grouped = {};
    Object.values(recipientFirstStart).forEach(date => {
      const dt = DateTime.fromJSDate(date);
      if (!dt.isValid) return;
      const month = dt.toFormat('yyyy-MM');
      grouped[month] = (grouped[month] || 0) + 1;
    });

    const months = Object.keys(grouped).sort();
    const counts = months.map(month => grouped[month]);

    res.json({ months, counts });
  } catch (err) {
    console.error('❌ Error calculating recipient starts by month:', err);
    res.status(500).send('Error calculating recipient starts by month');
  }
});

// 📊 Student finishes per Month
router.get('/finishes-by-month', async (req, res) => {
  try {
    // Get all completed appointments, sorted by start date
    const completedAppointments = await Appointment.find({ status: 'complete' }).sort({ start: 1 });

    // Map: recipientId -> array of completed appointment dates
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

    // For each recipient, sort dates and get the last appointment date
    const finishes = [];
    const now = DateTime.now();

    Object.values(recipientAppointments).forEach(datesArr => {
      // Sort dates ascending
      const sortedDates = datesArr
        .map(d => DateTime.fromJSDate(d))
        .filter(dt => dt.isValid)
        .sort((a, b) => a - b);

      if (sortedDates.length === 0) return;

      const last = sortedDates[sortedDates.length - 1];
      // If last appointment was more than 28 days ago, count as finished
      if (last.plus({ days: 28 }) < now) {
        finishes.push(last);
      }
    });

    // Group finishes by month
    const grouped = {};
    finishes.forEach(dt => {
      const month = dt.toFormat('yyyy-MM');
      grouped[month] = (grouped[month] || 0) + 1;
    });

    const months = Object.keys(grouped).sort();
    const counts = months.map(month => grouped[month]);

    res.json({ months, counts });
  } catch (err) {
    console.error('❌ Error calculating finishes by month:', err);
    res.status(500).send('Error calculating finishes by month');
  }
});


module.exports = router;