const express = require('express');
const router = express.Router();
const Client = require('../../models/Client');
const Appointment = require('../../models/Appointment');
const { DateTime } = require('luxon');
const cache = require('../../services/cache');

function postcodeArea(postcode) {
  if (!postcode) return null;
  const clean = postcode.trim().toUpperCase();
  const parts = clean.split(/\s+/);
  if (parts.length > 1) return parts[0];
  // No space: UK inward code is always 3 chars — strip them to get the outward code
  return clean.length > 3 ? clean.slice(0, -3) : clean;
}

function buildPostcodeQuery(postcodeAreas) {
  if (!Array.isArray(postcodeAreas) || postcodeAreas.length === 0) return {};
  // Match outward code followed by a space or digit (handles both "SW15 6SY" and "SW156SY")
  const toRegex = area => ({ postcode: { $regex: new RegExp(`^${area}[\\s\\d]`, 'i') } });
  if (postcodeAreas.length === 1) return toRegex(postcodeAreas[0]);
  return { $or: postcodeAreas.map(toRegex) };
}

async function computeEnquiriesByMonth(postcodeAreas) {
  const pcKey = Array.isArray(postcodeAreas) && postcodeAreas.length > 0
    ? [...postcodeAreas].sort().join(',') : 'all';
  const CACHE_KEY = `api:clients:enquiries-by-month:${pcKey}`;
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const query = { ...buildPostcodeQuery(postcodeAreas) };
  const clients = await Client.find(query).select('extra_attrs postcode').lean();
  const grouped = {};

  clients.forEach(client => {
    if (!Array.isArray(client.extra_attrs)) return;
    const enquiryAttr = client.extra_attrs.find(
      attr => attr.machine_name === 'enquiry_date' && attr.value
    );
    if (!enquiryAttr) return;

    const dt = DateTime.fromISO(enquiryAttr.value);
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

async function computeEnquiryConversionByMonth(postcodeAreas) {
  const pcKey = Array.isArray(postcodeAreas) && postcodeAreas.length > 0
    ? [...postcodeAreas].sort().join(',') : 'all';
  const CACHE_KEY = `api:clients:enquiry-conversion-by-month:${pcKey}`;
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const query = { extra_attrs: { $elemMatch: { machine_name: 'enquiry_date' } }, ...buildPostcodeQuery(postcodeAreas) };

  const clients = await Client.find(query).select('id extra_attrs postcode').lean();

  const monthBuckets = {};

  const clientsWithEnquiry = clients.map(client => {
    const attr = client.extra_attrs.find(a => a.machine_name === 'enquiry_date');
    if (!attr || !DateTime.fromISO(attr.value).isValid) return null;

    const enquiryDate = DateTime.fromISO(attr.value);
    const month = enquiryDate.toFormat('yyyy-MM');
    if (!monthBuckets[month]) monthBuckets[month] = { totalEnquiries: 0, clientInfos: [] };

    monthBuckets[month].totalEnquiries += 1;
    monthBuckets[month].clientInfos.push({ id: client.id, enquiryDate });
    return { id: client.id, enquiryDate };
  }).filter(Boolean);

  const completedAppointments = await Appointment.find({
    status: 'complete',
    'rcras.paying_client': { $in: clientsWithEnquiry.map(c => c.id) }
  }).select('start rcras.paying_client').lean();

  const appointmentsByClient = {};
  for (const appointment of completedAppointments) {
    const apptStart = DateTime.fromMillis(new Date(appointment.start).getTime());
    for (const rcra of appointment.rcras) {
      if (!appointmentsByClient[rcra.paying_client]) appointmentsByClient[rcra.paying_client] = [];
      appointmentsByClient[rcra.paying_client].push(apptStart);
    }
  }

  const result = Object.entries(monthBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { totalEnquiries, clientInfos }]) => {
      const converted = clientInfos.filter(({ id, enquiryDate }) => {
        const apptDates = appointmentsByClient[id] || [];
        return apptDates.some(apptDate => apptDate > enquiryDate);
      }).length;

      const conversionRate = totalEnquiries > 0
        ? parseFloat(((converted / totalEnquiries) * 100).toFixed(1))
        : 0;

      return { month, totalEnquiries, converted, conversionRate };
    });

  cache.set(CACHE_KEY, result);
  return result;
}

async function computeMapData() {
  const CACHE_KEY = 'api:clients:map-data';
  const hit = cache.get(CACHE_KEY);
  if (hit) return hit;

  const clients = await Client.find({
    latitude: { $exists: true, $ne: '' },
    longitude: { $exists: true, $ne: '' }
  }).select('postcode latitude longitude town').lean();

  // Group by postcode area, average the lat/lng
  const areaMap = {};
  for (const client of clients) {
    const area = postcodeArea(client.postcode);
    if (!area) continue;
    const lat = parseFloat(client.latitude);
    const lng = parseFloat(client.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;

    if (!areaMap[area]) areaMap[area] = { latSum: 0, lngSum: 0, count: 0, town: '' };
    areaMap[area].latSum += lat;
    areaMap[area].lngSum += lng;
    areaMap[area].count += 1;
    if (!areaMap[area].town && client.town) areaMap[area].town = client.town;
  }

  const payload = Object.entries(areaMap).map(([area, { latSum, lngSum, count, town }]) => ({
    area,
    lat: latSum / count,
    lng: lngSum / count,
    count,
    town
  }));

  cache.set(CACHE_KEY, payload);
  return payload;
}

router.get('/enquiries-by-month', async (req, res) => {
  const areas = req.query.postcodeAreas ? req.query.postcodeAreas.split(',').filter(Boolean) : [];
  try { res.json(await computeEnquiriesByMonth(areas)); }
  catch (err) { console.error('❌ Error calculating enquiries by month:', err); res.status(500).send('Error calculating enquiries by month'); }
});

router.get('/enquiry-conversion-by-month', async (req, res) => {
  const areas = req.query.postcodeAreas ? req.query.postcodeAreas.split(',').filter(Boolean) : [];
  try { res.json(await computeEnquiryConversionByMonth(areas)); }
  catch (err) { console.error('❌ Error calculating enquiry conversion rates:', err); res.status(500).send('Error calculating enquiry conversion rates'); }
});

router.get('/map-data', async (req, res) => {
  try { res.json(await computeMapData()); }
  catch (err) { console.error('❌ Error fetching map data:', err); res.status(500).send('Error fetching map data'); }
});

module.exports = router;
module.exports.computeEnquiriesByMonth = computeEnquiriesByMonth;
module.exports.computeEnquiryConversionByMonth = computeEnquiryConversionByMonth;
module.exports.computeMapData = computeMapData;
