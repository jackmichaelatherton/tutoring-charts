const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  start: Date,
  finish: Date,
  units: String,
  topic: String,
  location: String,
  rcras: [{
    recipient: Number,
    recipient_name: String,
    paying_client: Number,
    paying_client_name: String,
    charge_rate: String,
    status: String
  }],
  cjas: [{
    contractor: Number,
    contractor_name: String,
    pay_rate: String
  }],
  status: String,
  repeater: mongoose.Schema.Types.Mixed,
  service: {
    id: Number,
    name: String,
    dft_charge_type: String,
    created: Date,
    dft_charge_rate: String,
    dft_contractor_rate: String,
    last_updated: Date,
    status: String,
    url: String
  },
  charge_type: String
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
