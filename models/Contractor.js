const mongoose = require('mongoose');

const ContractorSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  user: {
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
    timezone: String
  },
  status: String,
  default_rate: String,
  qualifications: [String],
  skills: [{
    id: Number,
    subject: String,
    qual_level: String
  }],
  institutions: [String],
  receive_service_notifications: Boolean,
  review_rating: mongoose.Schema.Types.Mixed,
  review_duration: String,
  last_updated: Date,
  calendar_colour: String,
  labels: [String],
  extra_attrs: [{
    id: Number,
    value: String,
    type: String,
    machine_name: String,
    name: String
  }],
  work_done_details: {
    amount_owed: Number,
    amount_paid: Number,
    total_paid_hours: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Contractor', ContractorSchema);
