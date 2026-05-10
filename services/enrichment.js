const Appointment = require('../models/Appointment');
const AdHocCharge = require('../models/AdHocCharge');
const Recipient = require('../models/Recipient');
const Client = require('../models/Client');

function toPostcodeArea(postcode) {
  if (!postcode) return null;
  const clean = postcode.trim().toUpperCase();
  const parts = clean.split(/\s+/);
  if (parts.length > 1) return parts[0];
  // No space: UK inward code is always 3 chars — strip them to get the outward code
  return clean.length > 3 ? clean.slice(0, -3) : clean;
}

async function enrichAppointments() {
  console.log('🔄 Enriching appointments...');
  const start = Date.now();

  const appointments = await Appointment.find()
    .select('id rcras student')
    .lean();

  const recipientIds = [...new Set(
    appointments.map(a => a.rcras?.[0]?.recipient ?? a.student).filter(Boolean)
  )];
  const clientIds = [...new Set(
    appointments.map(a => a.rcras?.[0]?.paying_client).filter(Boolean)
  )];

  const [recipients, clients] = await Promise.all([
    Recipient.find({ id: { $in: recipientIds } }).select('id academic_year').lean(),
    Client.find({ id: { $in: clientIds } }).select('id postcode latitude longitude').lean()
  ]);

  const recipientMap = new Map(recipients.map(r => [r.id, r]));
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const bulkOps = appointments.map(apt => {
    const recipientId = apt.rcras?.[0]?.recipient ?? apt.student;
    const clientId = apt.rcras?.[0]?.paying_client;

    const recipient = recipientId ? recipientMap.get(recipientId) : null;
    const client = clientId ? clientMap.get(clientId) : null;

    const $set = {};
    const $unset = {};

    if (recipient?.academic_year) {
      $set.year_group = recipient.academic_year;
    } else {
      $unset.year_group = '';
    }

    if (client?.postcode) $set.postcode_area = toPostcodeArea(client.postcode);
    if (client?.latitude) $set.client_lat = client.latitude;
    if (client?.longitude) $set.client_lng = client.longitude;

    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    return { updateOne: { filter: { id: apt.id }, update } };
  });

  if (bulkOps.length) await Appointment.bulkWrite(bulkOps);
  console.log(`✅ Appointments enriched in ${Date.now() - start}ms`);
}

async function enrichAdHocCharges() {
  console.log('🔄 Enriching ad hoc charges...');
  const start = Date.now();

  const charges = await AdHocCharge.find()
    .select('id client')
    .lean();

  const clientIds = [...new Set(charges.map(c => c.client?.id).filter(Boolean))];

  const [clients, appointments] = await Promise.all([
    Client.find({ id: { $in: clientIds } }).select('id postcode').lean(),
    // Derive year_group via client → paying_client on appointments
    Appointment.find({
      'rcras.paying_client': { $in: clientIds },
      year_group: { $exists: true, $ne: null }
    }).select('rcras.paying_client year_group').lean(),
  ]);

  const clientMap = new Map(clients.map(c => [c.id, c]));

  // client id → year_group (first match wins)
  const clientYearGroupMap = new Map();
  for (const apt of appointments) {
    for (const rcra of (apt.rcras || [])) {
      if (rcra.paying_client && !clientYearGroupMap.has(rcra.paying_client)) {
        clientYearGroupMap.set(rcra.paying_client, apt.year_group);
      }
    }
  }

  const bulkOps = charges.map(charge => {
    const client = charge.client?.id ? clientMap.get(charge.client.id) : null;
    const yearGroup = charge.client?.id ? clientYearGroupMap.get(charge.client.id) : null;

    const $set = {};
    const $unset = {};

    if (yearGroup) {
      $set.year_group = yearGroup;
    } else {
      $unset.year_group = '';
    }

    if (client?.postcode) {
      $set.postcode_area = toPostcodeArea(client.postcode);
    } else {
      $unset.postcode_area = '';
    }

    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    return { updateOne: { filter: { id: charge.id }, update } };
  });

  if (bulkOps.length) await AdHocCharge.bulkWrite(bulkOps);
  console.log(`✅ Ad hoc charges enriched in ${Date.now() - start}ms`);
}

async function enrichAll() {
  await Promise.all([enrichAppointments(), enrichAdHocCharges()]);
}

module.exports = { enrichAppointments, enrichAdHocCharges, enrichAll };
