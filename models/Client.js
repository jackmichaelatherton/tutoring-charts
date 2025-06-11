const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  latitude: String,
  longitude: String,
  date_created: Date,
  first_name: String,
  last_name: String,
  email: String,
  mobile: String,
  phone: String,
  street: String,
  state: String,
  town: String,
  country: String,
  postcode: String,
  timezone: String,
  title: String,
  photo: String,
  status: String,
  is_taxable: Boolean,
  received_notifications: [String],
  invoices_count: Number,
  payment_pending: String,
  auto_charge: Boolean,
  associated_admin: mongoose.Schema.Types.Mixed, 
  associated_agent: mongoose.Schema.Types.Mixed, 
  paid_recipients: [mongoose.Schema.Types.Mixed], 
  pipeline_stage: mongoose.Schema.Types.Mixed, 
  calendar_colour: String,
  labels: [mongoose.Schema.Types.Mixed], 
  extra_attrs: [mongoose.Schema.Types.Mixed], 
  invoice_balance: String,
  available_balance: String
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);