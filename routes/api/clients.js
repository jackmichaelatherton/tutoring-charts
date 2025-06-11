const express = require('express');
const router = express.Router();
const Client = require('../../models/Client');
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

module.exports = router;