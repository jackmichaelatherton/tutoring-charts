const express = require('express');
const router = express.Router();

// Modular route handlers
router.use('/appointments', require('./api/appointments'));
router.use('/adhoc', require('./api/adhoc'));
router.use('/xero', require('./api/xero'));
router.use('/income', require('./api/income'));
router.use('/clients', require('./api/clients'));
router.use('/recipients', require('./api/recipients'));
router.use('/opportunities-email', require('./api/opportunities'));
router.use('/generate-options-email', require('./api/generateSummary'));


// Fetch TutorCruncher API
const { fetchAllPages } = require('../services/tutorcruncher-service');

// Load models
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');
const AdHocCharge = require('../models/AdHocCharge');
const Contractor = require('../models/Contractor');
const Invoice = require('../models/Invoice');
const PaymentOrder = require('../models/PaymentOrder');
const Recipient = require('../models/Recipient');
const RecipientAppointment = require('../models/RecipientAppointment');
const Report = require('../models/Report');
const Service = require('../models/Service');
const Tender = require('../models/Tender');
const Meta = require('../models/Meta');

// Endpoint + model mapping
const models = {
  ad_hoc_charges: { path: '/adhoccharges/', model: AdHocCharge },
  appointments: { path: '/appointments/', model: Appointment },
  clients: { path: '/clients/', model: Client },
  contractors: { path: '/contractors/', model: Contractor },
  invoices: { path: '/invoices/', model: Invoice },
  payment_orders: { path: '/payment-orders/', model: PaymentOrder },
  recipients: { path: '/recipients/', model: Recipient },
  recipient_appointments: { path: '/recipient_appointments/', model: RecipientAppointment },
  reports: { path: '/reports/', model: Report },
  services: { path: '/services/', model: Service },
  tenders: { path: '/tenders/', model: Tender }
};

// Sync endpoint - without blocking the cron job
router.get('/sync-all', async (req, res) => {
  res.json({ message: '🔁 Sync started in background.' });

  setTimeout(async () => {
    const results = {};

    for (const [key, { path, model }] of Object.entries(models)) {
      try {
        const data = await fetchAllPages(path);

        let count = 0;
        for (const entry of data) {
          let documentId = entry.id;

          // Fallback for recipient_appointments — use appointment + recipient ID combo
          if (!documentId && key === 'recipient_appointments') {
            if (entry.appointment && entry.recipient) {
              documentId = `${entry.appointment}_${entry.recipient}`; // compound key
              entry.id = documentId;
            }
          }

          // Other fallback (e.g. reports)
          if (!documentId) {
            const fallbackUrl = entry.url || (key === 'reports' && entry.appointment?.url);
            if (typeof fallbackUrl === 'string') {
              const parts = fallbackUrl.split('/').filter(Boolean);
              const maybeId = parts.at(-1);
              if (!isNaN(parseInt(maybeId))) {
                documentId = parseInt(maybeId);
                entry.id = documentId;
              }
            }
          }

          if (!documentId) {
            console.warn(`⚠️ Skipping invalid entry in ${key}:`, entry);
            continue;
          }

          if (key === 'appointments') {
            // If rcras/cjas are missing or empty, store the current service rates as a snapshot
            if ((!entry.rcras || entry.rcras.length === 0) && entry.service) {
              entry.client_rate = entry.service.dft_charge_rate;
              entry.tutor_rate = entry.service.dft_contractor_rate;
            }
            // Optionally, if rcras/cjas exist, store those rates as well for redundancy
            if (entry.rcras && entry.rcras[0]?.charge_rate) {
              entry.client_rate = entry.rcras[0].charge_rate;
            }
            if (entry.cjas && entry.cjas[0]?.pay_rate) {
              entry.tutor_rate = entry.cjas[0].pay_rate;
            }
          }

          // 📝 Special handling for reports
          if (key === 'reports' && Array.isArray(entry.extra_attrs)) {
            for (const attr of entry.extra_attrs) {
              if (attr.machine_name === 'client_report') {
                entry.sessionReport = attr.value;
              } else if (attr.machine_name.includes('attitude') || attr.machine_name.includes('engagement')) {
                entry.attitudeRating = attr.value;
              } else if (attr.machine_name.includes('progress')) {
                entry.progressRating = attr.value;
              }
            }
          }

          // ✅ Optional: flatten recipient ID into appointment for convenience (legacy fallback)
          if (key === 'appointments' && Array.isArray(entry.rcras) && entry.rcras.length > 0) {
            const recipient = entry.rcras[0]?.recipient;
            if (recipient) {
              entry.student = recipient;
            }
          }

          await model.updateOne(
            { id: documentId },
            { $set: { ...entry, id: documentId } },
            { upsert: true }
          );

          count++;
        }

        results[key] = `✅ Synced ${count} records`;
      } catch (err) {
        results[key] = `❌ Error: ${err.message}`;
        console.error(`❌ Failed syncing ${key}:`, err);
      }
    }

    // ⏱ Log last sync
    await Meta.updateOne(
      { key: 'lastSynced' },
      { $set: { value: new Date().toISOString() } },
      { upsert: true }
    );

    console.log('✅ Background sync complete:', results);
  }, 100);
});


router.get('/last-synced', async (req, res) => {
  const Meta = require('../models/Meta');
  const doc = await Meta.findOne({ key: 'lastSynced' });
  res.json({ lastSynced: doc?.value || null });
});

router.get('/sync-xero', async (req, res) => {
  try {
    const invoicesResponse = await xero.accountingApi.getInvoices(xero.tenants[0].tenantId);
    const invoices = invoicesResponse.body.invoices;

    // Save to Mongo
    const XeroInvoice = require('../../models/XeroInvoice');
    let count = 0;

    for (const invoice of invoices) {
      await XeroInvoice.updateOne(
        { InvoiceID: invoice.InvoiceID },
        { $set: invoice },
        { upsert: true }
      );
      count++;
    }

    res.json({ message: `✅ Synced ${count} invoices` });
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Failed to sync Xero data');
  }
});


module.exports = router;