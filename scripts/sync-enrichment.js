#!/usr/bin/env node
/**
 * Syncs recipients (for academic_year) and ad hoc charges (for client/service),
 * then re-runs enrichment to populate year_group and postcode_area.
 *
 * Run from the project root:
 *   node scripts/sync-enrichment.js
 *
 * Takes ~10–15 minutes due to TutorCruncher rate limiting.
 */

require('dotenv').config();
const connectDB = require('../db');
const { fetchAllPages } = require('../services/tutorcruncher-service');
const { enrichAll } = require('../services/enrichment');

const Recipient = require('../models/Recipient');
const AdHocCharge = require('../models/AdHocCharge');

async function syncModel(label, path, Model) {
  process.stdout.write(`\n📥 Fetching ${label} from TutorCruncher...\n`);
  const data = await fetchAllPages(path);
  console.log(`   Got ${data.length} records — saving to DB...`);

  let count = 0;
  for (const entry of data) {
    if (!entry.id) continue;
    await Model.updateOne(
      { id: entry.id },
      { $set: { ...entry, id: entry.id } },
      { upsert: true }
    );
    count++;
    if (count % 25 === 0) process.stdout.write(`   Saved ${count}/${data.length}\r`);
  }
  console.log(`✅ ${label}: ${count} records saved                `);
}

async function run() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Connected.\n');

  await syncModel('Recipients', '/recipients/', Recipient);
  await syncModel('Ad hoc charges', '/adhoccharges/', AdHocCharge);

  console.log('\n🔄 Running enrichment (year_group + postcode_area)...');
  await enrichAll();
  console.log('✅ Enrichment complete.\n');

  // Quick summary
  const [aptsWithYear, aptsWithPostcode, adhocWithYear, adhocWithPostcode] = await Promise.all([
    require('../models/Appointment').countDocuments({ year_group: { $exists: true, $ne: null } }),
    require('../models/Appointment').countDocuments({ postcode_area: { $exists: true, $ne: null } }),
    AdHocCharge.countDocuments({ year_group: { $exists: true, $ne: null } }),
    AdHocCharge.countDocuments({ postcode_area: { $exists: true, $ne: null } }),
  ]);

  console.log('Summary:');
  console.log(`  Appointments with year_group:   ${aptsWithYear}`);
  console.log(`  Appointments with postcode_area: ${aptsWithPostcode}`);
  console.log(`  Ad hoc charges with year_group:   ${adhocWithYear}`);
  console.log(`  Ad hoc charges with postcode_area: ${adhocWithPostcode}`);
  console.log('\nDone. Restart the server (or hit /api/re-enrich) to warm the cache.');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});
