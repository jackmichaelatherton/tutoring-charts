const express = require('express');
const router = express.Router();
const Client = require('../../models/Client');
const Appointment = require('../../models/Appointment');
const { DateTime } = require('luxon');


// 📊 Enquiries per Month
router.get('/enquiries-by-month', async (req, res) => {
  try {
    const clients = await Client.find();
    const grouped = {};

    clients.forEach(client => {
      if (!Array.isArray(client.extra_attrs)) return;
      const enquiryAttr = client.extra_attrs.find(
        attr => attr.machine_name === 'enquiry_date' && attr.value
      );
      if (!enquiryAttr) return;

      // Parse date and get month
      const dt = DateTime.fromISO(enquiryAttr.value);
      if (!dt.isValid) return;
      const month = dt.toFormat('yyyy-MM');

      grouped[month] = (grouped[month] || 0) + 1;
    });

    // Format as sorted array for charting
    const months = Object.keys(grouped).sort();
    const counts = months.map(month => grouped[month]);

    res.json({ months, counts });
  } catch (err) {
    console.error('❌ Error calculating enquiries by month:', err);
    res.status(500).send('Error calculating enquiries by month');
  }
});

router.get('/enquiry-conversion-by-month', async (req, res) => {
  try {
    const clients = await Client.find({
      extra_attrs: {
        $elemMatch: { machine_name: 'enquiry_date' }
      }
    });

    const monthBuckets = {};

    // Prepare client metadata
    const clientsWithEnquiry = clients.map(client => {
      const attr = client.extra_attrs.find(a => a.machine_name === 'enquiry_date');
      if (!attr || !DateTime.fromISO(attr.value).isValid) return null;

      const enquiryDate = DateTime.fromISO(attr.value);
      const month = enquiryDate.toFormat('yyyy-MM');
      if (!monthBuckets[month]) {
        monthBuckets[month] = { totalEnquiries: 0, clientInfos: [] };
      }

      monthBuckets[month].totalEnquiries += 1;
      monthBuckets[month].clientInfos.push({ id: client.id, enquiryDate });

      return { id: client.id, enquiryDate };
    }).filter(Boolean);

    // Pull all completed appointments that match any paying_client
    const completedAppointments = await Appointment.find({
      status: 'complete',
      'rcras.paying_client': { $in: clientsWithEnquiry.map(c => c.id) }
    });

    // Build a lookup: clientId => array of completed appointment dates
    const appointmentsByClient = {};
    for (const appointment of completedAppointments) {
      const apptStart = DateTime.fromMillis(new Date(appointment.start).getTime());

      for (const rcra of appointment.rcras) {
        if (!appointmentsByClient[rcra.paying_client]) {
          appointmentsByClient[rcra.paying_client] = [];
        }
        appointmentsByClient[rcra.paying_client].push(apptStart);
      }
    }

    // Check which clients converted (any completed appointment after their enquiry)
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

    res.json(result);
  } catch (err) {
    console.error('❌ Error calculating enquiry conversion rates:', err);
    res.status(500).send('Error calculating enquiry conversion rates');
  }
});

module.exports = router;