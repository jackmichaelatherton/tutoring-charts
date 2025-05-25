const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  title: String,
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
  latitude: String,
  longitude: String,
  date_created: Date,
  timezone: String,
  photo: String,
  status: String,
  is_taxable: Boolean,
  received_notifications: [String],
  invoices_count: Number,
  payment_pending: String,
  auto_charge: Boolean,
  associated_admin: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String
  },
  associated_agent: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String
  },
  pipeline_stage: {
    id: Number,
    name: String
  },
  paid_recipients: [{
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  }],
  calendar_colour: String,
  labels: [String],
  extra_attrs: [{
    id: Number,
    value: String,
    type: String,
    machine_name: String,
    name: String
  }],
  invoice_balance: String,
  available_balance: String
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);