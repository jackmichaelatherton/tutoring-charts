const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  allow_proposed_rates: Boolean,
  branch: Number,
  branch_tax_setup: String,
  cap: mongoose.Schema.Types.Mixed,
  colour: String,
  conjobs: [{
    contractor: Number,
    contractor_permissions: String,
    name: String,
    pay_rate: mongoose.Schema.Types.Mixed
  }],
  contractor_tax_setup: String,
  created: Date,
  description: String,
  dft_charge_type: String,
  dft_charge_rate: Number,
  dft_contractor_permissions: String,
  dft_contractor_rate: Number,
  dft_location: mongoose.Schema.Types.Mixed,
  dft_max_srs: mongoose.Schema.Types.Mixed,
  extra_attrs: [mongoose.Schema.Types.Mixed],
  extra_fee_per_apt: mongoose.Schema.Types.Mixed,
  inactivity_time: Number,
  is_bookable: Boolean,
  is_deleted: Boolean,
  labels: [String],
  latest_apt_ahc: Date,
  name: String,
  net_gross: String,
  rcrs: [{
    recipient: Number,
    recipient_name: String,
    paying_client: Number,
    paying_client_name: String,
    charge_rate: mongoose.Schema.Types.Mixed,
    agent: mongoose.Schema.Types.Mixed,
    agent_name: mongoose.Schema.Types.Mixed,
    agent_percentage: mongoose.Schema.Types.Mixed
  }],
  require_con_job: Boolean,
  require_rcr: Boolean,
  review_units: mongoose.Schema.Types.Mixed,
  sales_codes: mongoose.Schema.Types.Mixed,
  sr_premium: mongoose.Schema.Types.Mixed,
  status: String,
  total_apt_units: Number
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);

