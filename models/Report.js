const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  id: { type: Number, unique: true },

  appointment: {
    id: Number,
    start: Date,
    finish: Date,
    topic: String,
    status: String,
    url: String,
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
    }
  },

  approved: Boolean,

  client: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  },

  creator: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  },

  service_recipient: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  },

  dt_created: Date,

  extra_attrs: [{
    id: Number,
    machine_name: String,
    name: String,
    type: String,
    value: String
  }],

  // 🔽 Flattened custom fields
  sessionReport: String,
  attitudeRating: String,
  progressRating: String

}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);