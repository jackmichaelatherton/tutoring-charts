const express = require('express');
const router = express.Router();
const Appointment = require('../../models/Appointment');
const RecipientAppointment = require('../../models/RecipientAppointment');
const { DateTime } = require('luxon');

// Utility: Safely extract charge & pay rates
function extractRates(app) {
  const rcra = Array.isArray(app.rcras) && app.rcras.length > 0 && typeof app.rcras[0] === 'object' && !Array.isArray(app.rcras[0])
    ? app.rcras[0]
    : null;
  const cja = Array.isArray(app.cjas) && app.cjas.length > 0 && typeof app.cjas[0] === 'object' && !Array.isArray(app.cjas[0])
    ? app.cjas[0]
    : null;

  // Fallback to service default if not present on appointment
  const clientRate = rcra?.charge_rate != null
    ? parseFloat(rcra.charge_rate)
    : parseFloat(app.service?.dft_charge_rate || 0);
  const tutorRate = cja?.pay_rate != null
    ? parseFloat(cja.pay_rate)
    : parseFloat(app.service?.dft_contractor_rate || 0);

  return { clientRate, tutorRate };
}

// 📊 Total Commission by Month
router.get('/total-commission-by-month', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const grouped = {};

    appointments.forEach(app => {
      const start = DateTime.fromJSDate(app.start);
      const finish = DateTime.fromJSDate(app.finish);
      if (!start.isValid || !finish.isValid) return;

      const duration = finish.diff(start, 'hours').hours;
      if (!duration || duration <= 0) return;

      const month = start.toFormat('yyyy-MM');
      const status = (app.status || 'unknown').toLowerCase();
      const { clientRate, tutorRate } = extractRates(app);

      if (!clientRate || !tutorRate) return;
      const commission = (clientRate - tutorRate) * duration;

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

// ⏱ Lesson Hours and other metrics by Month
router.get('/by-month', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const recipientAppointments = await RecipientAppointment.find();

    // Map appointment.id to recipient
    const recipientMap = new Map();
    for (const ra of recipientAppointments) {
      if (ra.appointment && ra.recipient) {
        recipientMap.set(String(ra.appointment), ra.recipient);
      }
    }

    const monthMap = {};

    appointments.forEach(app => {
      const status = (app.status || 'unknown').toLowerCase();
      const start = new Date(app.start);
      const finish = new Date(app.finish);
      const durationHours = (finish - start) / 1000 / 60 / 60;
      const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          statuses: {},
          lessonHoursPerStatus: {},
          studentsPerStatus: {}
        };
      }

      // Skip invalid or zero/negative durations
      if (!durationHours || durationHours <= 0 || isNaN(durationHours)) {
        return;
      }

      // Count of appointments per status
      monthMap[monthKey].statuses[status] = (monthMap[monthKey].statuses[status] || 0) + 1;

      // Sum of lesson hours per status
      monthMap[monthKey].lessonHoursPerStatus[status] =
        (monthMap[monthKey].lessonHoursPerStatus[status] || 0) + durationHours;

      // Unique students per status
      const recipientId = recipientMap.get(String(app.id));
      if (recipientId) {
        if (!monthMap[monthKey].studentsPerStatus[status]) {
          monthMap[monthKey].studentsPerStatus[status] = new Set();
        }
        monthMap[monthKey].studentsPerStatus[status].add(recipientId);
      }
    });

    const months = Object.keys(monthMap).sort();
    const allStatuses = [...new Set(appointments.map(app => (app.status || 'unknown').toLowerCase()))];

    // Count of appointments per status/month (for legacy charts)
    const statuses = allStatuses.map(status => ({
      status,
      data: months.map(m => monthMap[m]?.statuses[status] || 0)
    }));

    // Sum of lesson hours per status/month (for LessonHoursChart)
    const lessonHoursPerMonthRaw = months.map(month => {
      const obj = {};
      for (const status of allStatuses) {
        obj[status] = monthMap[month]?.lessonHoursPerStatus[status] || 0;
      }
      return obj;
    });

    // Unique students per status/month
    const studentMapPerMonthRaw = months.map(month => {
      const obj = {};
      for (const status of allStatuses) {
        obj[status] = monthMap[month]?.studentsPerStatus[status]
          ? Array.from(monthMap[month].studentsPerStatus[status])
          : [];
      }
      return obj;
    });

    res.json({
      months,
      statuses, // count of appointments per status/month
      lessonHoursPerMonthRaw, // sum of lesson hours per status/month
      studentMapPerMonthRaw
    });

  } catch (err) {
    console.error('❌ Error in /by-month route:', err);
    res.status(500).send('Error aggregating appointment data');
  }
});


// 📊 Commission by Job (Pareto with Month)
router.get('/commission-by-job', async (req, res) => {
  try {
    const appointments = await Appointment.find({
      status: 'complete',
      start: { $exists: true }
    });

    const jobMap = {}; // { serviceName: { [month]: { client, tutor, commission, count } } }

    appointments.forEach(app => {
      const serviceName = app.service?.name || 'Unknown';
      const clientRate = parseFloat(app.rcras?.[0]?.charge_rate) || parseFloat(app.service?.dft_charge_rate || 0);
      const tutorRate = parseFloat(app.cjas?.[0]?.pay_rate) || parseFloat(app.service?.dft_contractor_rate || 0);
      const month = app.start ? new Date(app.start).toISOString().slice(0, 7) : null;
      if (!clientRate || !tutorRate || !month) return;

      if (!jobMap[serviceName]) jobMap[serviceName] = {};
      if (!jobMap[serviceName][month]) {
        jobMap[serviceName][month] = { client: 0, tutor: 0, commission: 0, count: 0 };
      }

      jobMap[serviceName][month].client += clientRate;
      jobMap[serviceName][month].tutor += tutorRate;
      jobMap[serviceName][month].commission += clientRate - tutorRate;
      jobMap[serviceName][month].count += 1;
    });

    const result = [];

    for (const [serviceName, monthlyData] of Object.entries(jobMap)) {
      for (const [month, values] of Object.entries(monthlyData)) {
        result.push({
          service: serviceName,
          month,
          clientRate: +(values.client / values.count).toFixed(2),
          tutorRate: +(values.tutor / values.count).toFixed(2),
          commissionRate: +((values.commission / values.count).toFixed(2)),
          totalClient: +values.client.toFixed(2),
          totalTutor: +values.tutor.toFixed(2),
          totalCommission: +values.commission.toFixed(2)
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error calculating commission by job');
  }
});


router.get('/complete-commission-by-month', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const grouped = {}; // { month: totalCommission }

    appointments.forEach(app => {
      const start = DateTime.fromJSDate(app.start);
      const finish = DateTime.fromJSDate(app.finish);
      if (!start.isValid || !finish.isValid) return;

      const status = (app.status || 'unknown').toLowerCase();
      if (status !== 'complete') return;

      const clientRate = parseFloat(app.rcras?.[0]?.charge_rate) ||
                         parseFloat(app.service?.dft_charge_rate || 0);
      const tutorRate = parseFloat(app.cjas?.[0]?.pay_rate) ||
                        parseFloat(app.service?.dft_contractor_rate || 0);

      if (!clientRate || !tutorRate) return;

      const duration = finish.diff(start, 'hours').hours;
      if (!duration || duration <= 0) return;

      const commission = (clientRate - tutorRate) * duration;
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
