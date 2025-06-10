const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  start: Date,
  finish: Date,
  units: String,
  topic: String,
  location: mongoose.Schema.Types.Mixed, // Accepts object, string, or null
  extra_attrs: [mongoose.Schema.Types.Mixed],
  rcras: [{
    appointment: Number,
    recipient: Number,
    recipient_name: String,
    paying_client: Number,
    paying_client_name: String,
    charge_rate: String,
    status: String
  }],
  student: Number,
  cjas: [{
    contractor: Number,
    name: String, // matches API field
    contractor_name: String, // for compatibility
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
  charge_type: String,
  client_rate: String, // For snapshotting rates at sync
  tutor_rate: String,  // For snapshotting rates at sync
  is_deleted: Boolean,
  url: String // API URL for reference
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);