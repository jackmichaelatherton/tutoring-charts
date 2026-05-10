const express = require('express');
const router = express.Router();
const Appointment = require('../../models/Appointment');
const RecipientAppointment = require('../../models/RecipientAppointment');
const Client = require('../../models/Client');
const { DateTime } = require('luxon');
const cache = require('../../services/cache');

function extractRates(app) {
  const rcra = Array.isArray(app.rcras) && app.rcras.length > 0 && typeof app.rcras[0] === 'object' && !Array.isArray(app.rcras[0])
    ? app.rcras[0]
    : null;
  const cja = Array.isArray(app.cjas) && app.cjas.length > 0 && typeof app.cjas[0] === 'object' && !Array.isArray(app.cjas[0])
    ? app.cjas[0]
    : null;

  const clientRate = rcra?.charge_rate != null
    ? parseFloat(rcra.charge_rate)
    : parseFloat(app.service?.dft_charge_rate || 0);
  const tutorRate = cja?.pay_rate != null
    ? parseFloat(cja.pay_rate)
    : parseFloat(app.service?.dft_contractor_rate || 0);

  return { clientRate, tutorRate };
}

function getAllMonthsInRange(start, end) {
  const result = [];
  let current = DateTime.fromFormat(start, 'yyyy-MM');
  const last = DateTime.fromFormat(end, 'yyyy-MM');
  while (current <= last) {
    result.push(current.toFormat('yyyy-MM'));
    current = current.plus({ months: 1 });
  }
  return result;
}

function buildFilterQuery(yearGroups, postcodeAreas) {
  const q = {};
  if (Array.isArray(yearGroups) && yearGroups.length > 0) {
    q.year_group = { $in: yearGroups };
  }
  if (Array.isArray(postcodeAreas) && postcodeAreas.length > 0) {
    const realAreas = postcodeAreas.filter(a => a !== 'No postcode');
    const includeNone = postcodeAreas.includes('No postcode');
    if (includeNone && realAreas.length > 0) {
      q.$or = [{ postcode_area: { $in: realAreas } }, { postcode_area: null }];
    } else if (includeNone) {
      q.postcode_area = null; // matches null + missing field
    } else {
      q.postcode_area = { $in: realAreas };
    }
  }
  return q;
}

function filterCacheKey(base, yearGroups, postcodeAreas) {
  const ygKey = Array.isArray(yearGroups) && yearGroups.length > 0
    ? [...yearGroups].sort().join(',') : 'all';
  const pcKey = Array.isArray(postcodeAreas) && postcodeAreas.length > 0
    ? [...postcodeAreas].sort().join(',') : 'all';
  return `${base}:${ygKey}:${pcKey}`;
}

const COMMISSION_PROJECTION = 'start finish status rcras.charge_rate cjas.pay_rate service.dft_charge_rate service.dft_contractor_rate';
const BY_MONTH_PROJECTION = 'start finish status id rcras.recipient rcras.charge_rate cjas.pay_rate service.dft_charge_rate service.dft_contractor_rate';
const JOB_PROJECTION = 'start status rcras.charge_rate cjas.pay_rate service.name service.dft_charge_rate service.dft_contractor_rate';

async function computeTotalCommissionByMonth(yearGroups, postcodeAreas) {
  const CACHE_KEY = filterCacheKey('api:appointments:total-commission-by-month', yearGroups, postcodeAreas);
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const appointments = await Appointment.find(buildFilterQuery(yearGroups, postcodeAreas)).select(COMMISSION_PROJECTION).lean();
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

  const payload = { months: allMonths, statuses: result };
  cache.set(CACHE_KEY, payload);
  return payload;
}

async function computeAvgCommissionByMonth(start, end, yearGroups, postcodeAreas) {
  if (!start || !end) {
    const first = await Appointment.findOne().sort({ start: 1 }).select('start').lean();
    const last = await Appointment.findOne().sort({ start: -1 }).select('start').lean();
    start = start || (first ? DateTime.fromJSDate(first.start).toFormat('yyyy-MM') : DateTime.now().toFormat('yyyy-MM'));
    end = end || (last ? DateTime.fromJSDate(last.start).toFormat('yyyy-MM') : DateTime.now().toFormat('yyyy-MM'));
  }

  const CACHE_KEY = filterCacheKey(`api:appointments:avg-commission-by-month:${start}:${end}`, yearGroups, postcodeAreas);
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const allMonths = getAllMonthsInRange(start, end);
  const query = { start: { $gte: new Date(`${start}-01`), $lte: new Date(`${end}-31`) }, ...buildFilterQuery(yearGroups, postcodeAreas) };
  const appointments = await Appointment.find(query).select(COMMISSION_PROJECTION).lean();

  const grouped = {};
  const allStatusesSet = new Set();

  appointments.forEach(app => {
    const s = DateTime.fromJSDate(app.start);
    const f = DateTime.fromJSDate(app.finish);
    if (!s.isValid || !f.isValid) return;

    const duration = f.diff(s, 'hours').hours;
    if (!duration || duration <= 0) return;

    const { clientRate, tutorRate } = extractRates(app);
    if (!clientRate || !tutorRate) return;

    const commission = (clientRate - tutorRate) * duration;
    const month = s.toFormat('yyyy-MM');
    const status = (app.status || 'unknown').toLowerCase();

    allStatusesSet.add(status);
    if (!grouped[month]) grouped[month] = {};
    if (!grouped[month][status]) grouped[month][status] = { totalCommission: 0, totalHours: 0 };
    grouped[month][status].totalCommission += commission;
    grouped[month][status].totalHours += duration;
  });

  const allStatuses = Array.from(allStatusesSet);
  const statuses = allStatuses.map(status => ({
    status,
    data: allMonths.map(month =>
      (grouped[month] && grouped[month][status])
        ? grouped[month][status]
        : { totalCommission: 0, totalHours: 0 }
    )
  }));

  const payload = { months: allMonths, statuses };
  cache.set(CACHE_KEY, payload);
  return payload;
}

async function computeByMonth(yearGroups, postcodeAreas) {
  const CACHE_KEY = filterCacheKey('api:appointments:by-month', yearGroups, postcodeAreas);
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const appointments = await Appointment.find(buildFilterQuery(yearGroups, postcodeAreas)).select(BY_MONTH_PROJECTION).lean();
  const recipientAppointments = await RecipientAppointment.find().select('appointment recipient').lean();

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
      monthMap[monthKey] = { statuses: {}, lessonHoursPerStatus: {}, studentsPerStatus: {} };
    }

    if (!durationHours || durationHours <= 0 || isNaN(durationHours)) return;

    monthMap[monthKey].statuses[status] = (monthMap[monthKey].statuses[status] || 0) + 1;
    monthMap[monthKey].lessonHoursPerStatus[status] =
      (monthMap[monthKey].lessonHoursPerStatus[status] || 0) + durationHours;

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

  const statuses = allStatuses.map(status => ({
    status,
    data: months.map(m => monthMap[m]?.statuses[status] || 0)
  }));

  const lessonHoursPerMonthRaw = months.map(month => {
    const obj = {};
    for (const status of allStatuses) obj[status] = monthMap[month]?.lessonHoursPerStatus[status] || 0;
    return obj;
  });

  const studentMapPerMonthRaw = months.map(month => {
    const obj = {};
    for (const status of allStatuses) {
      obj[status] = monthMap[month]?.studentsPerStatus[status]
        ? Array.from(monthMap[month].studentsPerStatus[status])
        : [];
    }
    return obj;
  });

  const payload = { months, statuses, lessonHoursPerMonthRaw, studentMapPerMonthRaw };
  cache.set(CACHE_KEY, payload);
  return payload;
}

async function computeCommissionByJob(yearGroups, postcodeAreas) {
  const CACHE_KEY = filterCacheKey('api:appointments:commission-by-job', yearGroups, postcodeAreas);
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const query = { status: 'complete', start: { $exists: true }, ...buildFilterQuery(yearGroups, postcodeAreas) };
  const appointments = await Appointment.find(query).select(JOB_PROJECTION).lean();

  const jobMap = {};

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

  cache.set(CACHE_KEY, result);
  return result;
}

async function computeCompleteCommissionByMonth(yearGroups, postcodeAreas) {
  const CACHE_KEY = filterCacheKey('api:appointments:complete-commission-by-month', yearGroups, postcodeAreas);
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const query = { status: 'complete', ...buildFilterQuery(yearGroups, postcodeAreas) };
  const appointments = await Appointment.find(query).select(COMMISSION_PROJECTION).lean();
  const grouped = {};

  appointments.forEach(app => {
    const start = DateTime.fromJSDate(app.start);
    const finish = DateTime.fromJSDate(app.finish);
    if (!start.isValid || !finish.isValid) return;

    const clientRate = parseFloat(app.rcras?.[0]?.charge_rate) || parseFloat(app.service?.dft_charge_rate || 0);
    const tutorRate = parseFloat(app.cjas?.[0]?.pay_rate) || parseFloat(app.service?.dft_contractor_rate || 0);
    if (!clientRate || !tutorRate) return;

    const duration = finish.diff(start, 'hours').hours;
    if (!duration || duration <= 0) return;

    const commission = (clientRate - tutorRate) * duration;
    const month = start.toFormat('yyyy-MM');
    grouped[month] = (grouped[month] || 0) + commission;
  });

  const allMonths = Object.keys(grouped).sort();
  const data = allMonths.map(month => grouped[month] || 0);

  const payload = { months: allMonths, data };
  cache.set(CACHE_KEY, payload);
  return payload;
}

function parseYearGroups(query) {
  return query.yearGroups ? query.yearGroups.split(',').filter(Boolean) : [];
}

function parsePostcodeAreas(query) {
  return query.postcodeAreas ? query.postcodeAreas.split(',').filter(Boolean) : [];
}

// Route handlers
router.get('/filters', async (req, res) => {
  try {
    const CACHE_KEY = 'api:appointments:filters';
    const hit = cache.get(CACHE_KEY);
    if (hit) return res.json(hit);

    const [yearGroups, postcodeAreaValues, clients] = await Promise.all([
      Appointment.distinct('year_group', { year_group: { $ne: null, $exists: true } }),
      Appointment.distinct('postcode_area', { postcode_area: { $ne: null, $exists: true } }),
      Client.find({ postcode: { $exists: true, $ne: '' } }).select('postcode town').lean()
    ]);

    const areaTownMap = {};
    for (const c of clients) {
      if (!c.postcode) continue;
      const clean = c.postcode.trim().toUpperCase();
      const parts = clean.split(/\s+/);
      const area = parts.length > 1 ? parts[0] : (clean.length > 3 ? clean.slice(0, -3) : clean);
      if (!areaTownMap[area] && c.town) areaTownMap[area] = c.town;
    }

    const postcodeAreas = postcodeAreaValues
      .filter(Boolean)
      .sort()
      .map(area => ({ area, town: areaTownMap[area] || '' }));

    const payload = { yearGroups: yearGroups.filter(Boolean).sort(), postcodeAreas };
    cache.set(CACHE_KEY, payload);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching filters');
  }
});

router.get('/total-commission-by-month', async (req, res) => {
  try { res.json(await computeTotalCommissionByMonth(parseYearGroups(req.query), parsePostcodeAreas(req.query))); }
  catch (err) { console.error(err); res.status(500).send('Error calculating total commission'); }
});

router.get('/avg-commission-by-month', async (req, res) => {
  try { res.json(await computeAvgCommissionByMonth(req.query.start, req.query.end, parseYearGroups(req.query), parsePostcodeAreas(req.query))); }
  catch (err) { console.error(err); res.status(500).send('Error calculating average commission'); }
});

router.get('/by-month', async (req, res) => {
  try { res.json(await computeByMonth(parseYearGroups(req.query), parsePostcodeAreas(req.query))); }
  catch (err) { console.error('❌ Error in /by-month route:', err); res.status(500).send('Error aggregating appointment data'); }
});

router.get('/commission-by-job', async (req, res) => {
  try { res.json(await computeCommissionByJob(parseYearGroups(req.query), parsePostcodeAreas(req.query))); }
  catch (err) { console.error(err); res.status(500).send('Error calculating commission by job'); }
});

router.get('/complete-commission-by-month', async (req, res) => {
  try { res.json(await computeCompleteCommissionByMonth(parseYearGroups(req.query), parsePostcodeAreas(req.query))); }
  catch (err) { console.error(err); res.status(500).send('Error calculating complete commission'); }
});

module.exports = router;
module.exports.computeTotalCommissionByMonth = computeTotalCommissionByMonth;
module.exports.computeAvgCommissionByMonth = computeAvgCommissionByMonth;
module.exports.computeByMonth = computeByMonth;
module.exports.computeCommissionByJob = computeCommissionByJob;
module.exports.computeCompleteCommissionByMonth = computeCompleteCommissionByMonth;
