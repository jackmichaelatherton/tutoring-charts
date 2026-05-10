const { computeTotalCommissionByMonth, computeAvgCommissionByMonth, computeByMonth, computeCommissionByJob, computeCompleteCommissionByMonth } = require('../routes/api/appointments');
const { computeAdHocRevenueByMonth } = require('../routes/api/adhoc');
const { computeEnquiriesByMonth, computeEnquiryConversionByMonth, computeMapData } = require('../routes/api/clients');
const { computeStartsByMonth, computeFinishesByMonth } = require('../routes/api/recipients');
const cache = require('./cache');
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');

async function warmCache() {
  console.log('🔥 Warming cache...');
  const start = Date.now();

  // Warm unfiltered dashboard data
  const tasks = [
    computeTotalCommissionByMonth(),
    computeAvgCommissionByMonth(),
    computeByMonth(),
    computeCommissionByJob(),
    computeCompleteCommissionByMonth(),
    computeAdHocRevenueByMonth(),
    computeEnquiriesByMonth(),
    computeEnquiryConversionByMonth(),
    computeStartsByMonth(),
    computeFinishesByMonth(),
    computeMapData(),
    // Warm filters list
    (async () => {
      const CACHE_KEY = 'api:appointments:filters';
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
      cache.set(CACHE_KEY, { yearGroups: yearGroups.filter(Boolean).sort(), postcodeAreas });
    })()
  ];

  const results = await Promise.allSettled(tasks);
  const failed = results.filter(r => r.status === 'rejected');

  if (failed.length) {
    failed.forEach(r => console.error('❌ Cache warm error:', r.reason));
  }

  console.log(`✅ Cache warmed in ${Date.now() - start}ms (${tasks.length - failed.length}/${tasks.length} succeeded)`);
}

module.exports = { warmCache };
